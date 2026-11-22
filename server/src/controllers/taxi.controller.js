import pool, { query } from '../config/db.js';
import { emitLiveUpdate } from '../socket/index.js';

const taxiChanged = (req) => emitLiveUpdate(req.app.get('io'), 'taxi');

const validRideType = (value) => ['offer', 'join'].includes(value);

export const listRides = async (req, res, next) => {
  try {
    const result = await query(`SELECT r.*, u.full_name AS posted_by_name,
      COALESCE(jsonb_agg(jsonb_build_object('id', q.id, 'requester_id', q.requester_id, 'seats_requested', q.seats_requested,
        'requester_name', requester.full_name, 'status', q.status, 'created_at', q.created_at))
        FILTER (WHERE q.id IS NOT NULL), '[]'::jsonb) AS requests
      FROM taxi_rides r JOIN users u ON u.id=r.posted_by
      LEFT JOIN taxi_ride_requests q ON q.ride_id=r.id
      LEFT JOIN users requester ON requester.id=q.requester_id
      WHERE r.status IN ('open','full') OR r.posted_by=$1 OR EXISTS (SELECT 1 FROM taxi_ride_requests own WHERE own.ride_id=r.id AND own.requester_id=$1)
      GROUP BY r.id, u.full_name ORDER BY r.departure_at NULLS LAST, r.created_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createRide = async (req, res, next) => {
  const { ride_type, departure, destination, departure_at, notes, total_seats } = req.body;
  const seats = Number(total_seats);
  if (!validRideType(ride_type) || !departure?.trim() || !destination?.trim() || !Number.isInteger(seats) || seats < 1 || seats > 20) {
    return res.status(400).json({ message: 'Choose a ride type, enter both locations, and provide 1–20 seats' });
  }
  try {
    const result = await query(`INSERT INTO taxi_rides
      (posted_by, ride_type, departure, destination, departure_at, notes, total_seats, available_seats)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
    [req.user.id, ride_type, departure.trim(), destination.trim(), departure_at || null, notes?.trim() || null, seats]);
    res.status(201).json(result.rows[0]);
    taxiChanged(req);
  } catch (err) { next(err); }
};

export const requestRide = async (req, res, next) => {
  try {
    const ride = await query('SELECT id, posted_by, ride_type, status, available_seats FROM taxi_rides WHERE id=$1', [req.params.id]);
    if (!ride.rows.length) return res.status(404).json({ message: 'Ride not found' });
    if (ride.rows[0].ride_type !== 'offer') return res.status(400).json({ message: 'This post allows direct joining' });
    if (ride.rows[0].posted_by === req.user.id) return res.status(400).json({ message: 'You cannot request your own ride' });
    if (ride.rows[0].status !== 'open' || ride.rows[0].available_seats < 1) return res.status(409).json({ message: 'This ride has no seats available' });
    const seatsRequested = Number(req.body.seats_requested || 1);
    if (!Number.isInteger(seatsRequested) || seatsRequested < 1 || seatsRequested > 20) return res.status(400).json({ message: 'Request between 1 and 20 seats' });
    const result = await query('INSERT INTO taxi_ride_requests (ride_id, requester_id, seats_requested) VALUES ($1,$2,$3) RETURNING *', [req.params.id, req.user.id, seatsRequested]);
    res.status(201).json(result.rows[0]);
    taxiChanged(req);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'You already requested this ride' });
    next(err);
  }
};

export const decideRequest = async (req, res, next) => {
  const { decision } = req.body;
  if (!['accepted', 'declined'].includes(decision)) return res.status(400).json({ message: 'Choose accept or decline' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ride = await client.query('SELECT * FROM taxi_rides WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!ride.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Ride not found' }); }
    if (ride.rows[0].posted_by !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'Only the person who posted this ride can decide requests' }); }
    const request = await client.query('SELECT * FROM taxi_ride_requests WHERE id=$1 AND ride_id=$2 FOR UPDATE', [req.params.requestId, req.params.id]);
    if (!request.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Request not found' }); }
    if (request.rows[0].status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ message: 'This request has already been decided' }); }
    if (decision === 'accepted') {
      const seatsToApprove = Number(req.body.seats_approved ?? request.rows[0].seats_requested);
      if (!Number.isInteger(seatsToApprove) || seatsToApprove < 1 || seatsToApprove > request.rows[0].seats_requested) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Approve between 1 seat and the number requested' }); }
      if (ride.rows[0].status !== 'open' || ride.rows[0].available_seats < seatsToApprove) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Not enough seats remain for this request' }); }
      await client.query("UPDATE taxi_rides SET available_seats=available_seats-$2, status=CASE WHEN available_seats=$2 THEN 'full' ELSE 'open' END WHERE id=$1", [req.params.id, seatsToApprove]);
      await client.query('UPDATE taxi_ride_requests SET seats_requested=$1 WHERE id=$2', [seatsToApprove, req.params.requestId]);
    }
    const result = await client.query('UPDATE taxi_ride_requests SET status=$1 WHERE id=$2 RETURNING *', [decision, req.params.requestId]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
    taxiChanged(req);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
};

export const joinRide = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ride = await client.query('SELECT * FROM taxi_rides WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!ride.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Ride not found' }); }
    if (ride.rows[0].ride_type !== 'offer') { await client.query('ROLLBACK'); return res.status(400).json({ message: 'This ride does not allow direct joining' }); }
    if (ride.rows[0].posted_by === req.user.id) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'You cannot join your own post' }); }
    if (ride.rows[0].status !== 'open' || ride.rows[0].available_seats < 1) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'This ride has no seats available' }); }
    await client.query('INSERT INTO taxi_ride_requests (ride_id, requester_id, status) VALUES ($1,$2,\'accepted\')', [req.params.id, req.user.id]);
    await client.query("UPDATE taxi_rides SET available_seats=available_seats-1, status=CASE WHEN available_seats=1 THEN 'full' ELSE 'open' END WHERE id=$1", [req.params.id]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'You joined the ride' });
    taxiChanged(req);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'You already joined or requested this ride' });
    next(err);
  } finally { client.release(); }
};

export const cancelRide = async (req, res, next) => {
  try {
    const result = await query("UPDATE taxi_rides SET status='cancelled' WHERE id=$1 AND posted_by=$2 RETURNING id", [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Ride not found or you did not post it' });
    res.json({ message: 'Ride removed' });
    taxiChanged(req);
  } catch (err) { next(err); }
};

export const listSeatRequests = async (req, res, next) => {
  try {
    const result = await query(`SELECT sr.*, requester.full_name AS requester_name,
      COALESCE(jsonb_agg(jsonb_build_object('id', so.id, 'driver_id', so.driver_id,
        'driver_name', driver.full_name, 'message', so.message, 'seats_offered', so.seats_offered,
        'status', so.status, 'created_at', so.created_at)) FILTER (WHERE so.id IS NOT NULL), '[]'::jsonb) AS offers
      FROM taxi_seat_requests sr JOIN users requester ON requester.id=sr.requester_id
      LEFT JOIN taxi_seat_offers so ON so.seat_request_id=sr.id
      LEFT JOIN users driver ON driver.id=so.driver_id
      WHERE sr.status='open' OR sr.requester_id=$1 OR EXISTS
        (SELECT 1 FROM taxi_seat_offers own WHERE own.seat_request_id=sr.id AND own.driver_id=$1)
      GROUP BY sr.id, requester.full_name ORDER BY sr.departure_at NULLS LAST, sr.created_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const createSeatRequest = async (req, res, next) => {
  const { departure, destination, departure_at, seats_needed, notes } = req.body;
  const seats = Number(seats_needed);
  if (!departure?.trim() || !destination?.trim() || !Number.isInteger(seats) || seats < 1 || seats > 20) {
    return res.status(400).json({ message: 'Enter your route and request between 1 and 20 seats' });
  }
  try {
    const result = await query(`INSERT INTO taxi_seat_requests (requester_id, departure, destination, departure_at, seats_needed, notes)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, departure.trim(), destination.trim(), departure_at || null, seats, notes?.trim() || null]);
    res.status(201).json(result.rows[0]);
    taxiChanged(req);
  } catch (err) { next(err); }
};

export const offerSeats = async (req, res, next) => {
  const { message, seats_offered = 1 } = req.body;
  const seats = Number(seats_offered);
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) return res.status(400).json({ message: 'Offer between 1 and 20 seats' });
  try {
    const seatRequest = await query('SELECT requester_id, status, seats_needed FROM taxi_seat_requests WHERE id=$1', [req.params.id]);
    if (!seatRequest.rows.length) return res.status(404).json({ message: 'Seat request not found' });
    if (seatRequest.rows[0].requester_id === req.user.id) return res.status(400).json({ message: 'You cannot offer seats on your own request' });
    if (seatRequest.rows[0].status !== 'open') return res.status(409).json({ message: 'This seat request is no longer open' });
    const result = await query(`INSERT INTO taxi_seat_offers (seat_request_id, driver_id, message, seats_offered)
      VALUES ($1,$2,$3,$4) RETURNING *`, [req.params.id, req.user.id, message?.trim() || null, seats]);
    res.status(201).json(result.rows[0]);
    taxiChanged(req);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'You have already offered seats on this request' });
    next(err);
  }
};

export const decideSeatOffer = async (req, res, next) => {
  const decision = req.body.decision;
  if (!['accepted', 'declined'].includes(decision)) return res.status(400).json({ message: 'Choose accept or decline' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query('SELECT * FROM taxi_seat_requests WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!request.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Seat request not found' }); }
    if (request.rows[0].requester_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'Only the requester can decide seat offers' }); }
    if (!['open', 'matched'].includes(request.rows[0].status)) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'This seat request is closed' }); }
    const offer = await client.query('SELECT * FROM taxi_seat_offers WHERE id=$1 AND seat_request_id=$2 FOR UPDATE', [req.params.offerId, req.params.id]);
    if (!offer.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Seat offer not found' }); }
    if (offer.rows[0].status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ message: 'This offer has already been decided' }); }
    if (decision === 'accepted') {
      await client.query("UPDATE taxi_seat_offers SET status='accepted' WHERE id=$1", [req.params.offerId]);
      const accepted = await client.query("SELECT COALESCE(SUM(seats_offered),0)::int AS seats FROM taxi_seat_offers WHERE seat_request_id=$1 AND status='accepted'", [req.params.id]);
      if (accepted.rows[0].seats >= request.rows[0].seats_needed) {
        await client.query("UPDATE taxi_seat_requests SET status='matched' WHERE id=$1", [req.params.id]);
        await client.query("UPDATE taxi_seat_offers SET status='declined' WHERE seat_request_id=$1 AND status='pending'", [req.params.id]);
      } else {
        await client.query("UPDATE taxi_seat_requests SET status='open' WHERE id=$1", [req.params.id]);
      }
    } else {
      await client.query("UPDATE taxi_seat_offers SET status='declined' WHERE id=$1", [req.params.offerId]);
    }
    await client.query('COMMIT');
    res.json({ message: decision === 'accepted' ? 'Seat offer accepted' : 'Seat offer declined' });
    taxiChanged(req);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
};

export const cancelSeatRequest = async (req, res, next) => {
  try {
    const result = await query("UPDATE taxi_seat_requests SET status='cancelled' WHERE id=$1 AND requester_id=$2 RETURNING id", [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Seat request not found or you did not post it' });
    res.json({ message: 'Seat request removed' });
    taxiChanged(req);
  } catch (err) { next(err); }
};
