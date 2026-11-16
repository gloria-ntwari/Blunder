import pool, { query } from '../config/db.js';

const managementRoles = ['super_admin', 'sv_committee', 'committee'];
const isManager = (req) => managementRoles.includes(req.user.role);
const canView = (req, res) => {
  if (['teacher', 'admin'].includes(req.user.role)) {
    res.status(403).json({ message: 'Lundesliga is available to student accounts and league managers' });
    return false;
  }
  return true;
};

export const searchLeagueUsers = async (req, res, next) => {
  if (!canView(req, res)) return;
  const search = String(req.query.search || '').trim();
  if (search.length < 2) return res.json([]);
  try {
    const result = await query(
      `SELECT id, full_name, email, role::text AS role FROM users
       WHERE is_active = TRUE AND role::text IN ('student', 'student_leader')
         AND (full_name ILIKE $1 OR email ILIKE $1)
       ORDER BY full_name LIMIT 10`, [`%${search}%`]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

export const leagueState = async (req, res, next) => {
  if (!canView(req, res)) return;
  try {
    const [houses, fixtures, goals] = await Promise.all([
      query(`SELECT h.id, h.name, h.leader_id, leader.full_name AS leader_name,
                    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', p.id, 'user_id', p.user_id, 'full_name', player.full_name, 'avatar_url', player.avatar_url, 'gender', p.gender)) FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb) AS players
             FROM league_houses h JOIN users leader ON leader.id = h.leader_id
             LEFT JOIN league_players p ON p.house_id = h.id LEFT JOIN users player ON player.id = p.user_id
             GROUP BY h.id, leader.full_name ORDER BY h.name`),
      query(`SELECT f.id, f.home_house_id, home.name AS home_name, f.away_house_id, away.name AS away_name,
                    f.gender, f.match_date, f.venue, f.status,
                    COUNT(g.id) FILTER (WHERE p.house_id = f.home_house_id)::int AS home_score,
                    COUNT(g.id) FILTER (WHERE p.house_id = f.away_house_id)::int AS away_score
             FROM league_fixtures f JOIN league_houses home ON home.id=f.home_house_id
             JOIN league_houses away ON away.id=f.away_house_id
             LEFT JOIN league_goals g ON g.fixture_id=f.id LEFT JOIN league_players p ON p.id=g.player_id
             GROUP BY f.id, home.name, away.name ORDER BY f.match_date NULLS LAST, f.created_at DESC`),
      query(`SELECT g.id, g.fixture_id, g.player_id, p.user_id, u.full_name AS player_name,
                    p.gender, h.id AS house_id, h.name AS house_name, f.gender AS fixture_gender
             FROM league_goals g JOIN league_players p ON p.id=g.player_id JOIN users u ON u.id=p.user_id
             JOIN league_houses h ON h.id=p.house_id JOIN league_fixtures f ON f.id=g.fixture_id
             ORDER BY g.created_at`),
    ]);
    res.json({ houses: houses.rows, fixtures: fixtures.rows, goals: goals.rows, canManage: isManager(req), userId: req.user.id });
  } catch (err) { next(err); }
};

export const createHouse = async (req, res, next) => {
  if (!isManager(req)) return res.status(403).json({ message: 'Only the Super Admin and SV Committee can manage houses' });
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const leaderId = req.body.leaderId;
  if (!name || !leaderId) return res.status(400).json({ message: 'House name and leader are required' });
  try {
    const leader = await query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND role::text IN ('student','student_leader')`, [leaderId]);
    if (!leader.rows.length) return res.status(400).json({ message: 'Choose an active student as house leader' });
    const result = await query('INSERT INTO league_houses (name, leader_id, created_by) VALUES ($1,$2,$3) RETURNING id,name,leader_id', [name, leaderId, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { if (err.code === '23505') return res.status(409).json({ message: 'A house with this name already exists' }); next(err); }
};

export const updateHouse = async (req, res, next) => {
  if (!isManager(req)) return res.status(403).json({ message: 'Only league managers can edit houses' });
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const leaderId = req.body.leaderId;
  if (!name || !leaderId) return res.status(400).json({ message: 'House name and leader are required' });
  try {
    const leader = await query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND role::text IN ('student','student_leader')`, [leaderId]);
    if (!leader.rows.length) return res.status(400).json({ message: 'Choose an active student as house leader' });
    const result = await query('UPDATE league_houses SET name=$1, leader_id=$2 WHERE id=$3 RETURNING id,name,leader_id', [name, leaderId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'House not found' });
    res.json(result.rows[0]);
  } catch (err) { if (err.code === '23505') return res.status(409).json({ message: 'A house with this name already exists' }); next(err); }
};

export const deleteHouse = async (req, res, next) => {
  if (!isManager(req)) return res.status(403).json({ message: 'Only league managers can delete houses' });
  try {
    const result = await query('DELETE FROM league_houses WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'House not found' });
    res.json({ message: 'House deleted' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ message: 'This house is used in fixtures and cannot be deleted until those fixtures are removed' });
    next(err);
  }
};

export const addHousePlayer = async (req, res, next) => {
  const { userId, gender } = req.body;
  if (!['girls', 'boys'].includes(gender) || !userId) return res.status(400).json({ message: 'Choose a player and girls or boys category' });
  try {
    const houseResult = await query('SELECT id, leader_id FROM league_houses WHERE id=$1', [req.params.id]);
    if (!houseResult.rows.length) return res.status(404).json({ message: 'House not found' });
    const house = houseResult.rows[0];
    if (!isManager(req) && house.leader_id !== req.user.id) return res.status(403).json({ message: 'Only this house leader or a league manager can add players' });
    const player = await query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND role::text IN ('student','student_leader')`, [userId]);
    if (!player.rows.length) return res.status(400).json({ message: 'Choose an active student' });
    const result = await query('INSERT INTO league_players (house_id,user_id,gender,added_by) VALUES ($1,$2,$3,$4) RETURNING *', [house.id, userId, gender, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { if (err.code === '23505') return res.status(409).json({ message: 'This player is already in that house' }); next(err); }
};

export const updateHousePlayer = async (req, res, next) => {
  const { userId, gender } = req.body;
  if (!['girls', 'boys'].includes(gender) || !userId) return res.status(400).json({ message: 'Choose a player and girls or boys category' });
  try {
    const houseResult = await query('SELECT id, leader_id FROM league_houses WHERE id=$1', [req.params.id]);
    if (!houseResult.rows.length) return res.status(404).json({ message: 'House not found' });
    if (!isManager(req) && houseResult.rows[0].leader_id !== req.user.id) return res.status(403).json({ message: 'Only this house leader or a league manager can edit its players' });
    const player = await query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND role::text IN ('student','student_leader')`, [userId]);
    if (!player.rows.length) return res.status(400).json({ message: 'Choose an active student' });
    const result = await query(`UPDATE league_players SET user_id=$1, gender=$2 WHERE id=$3 AND house_id=$4 RETURNING *`, [userId, gender, req.params.playerId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Player not found in this house' });
    res.json(result.rows[0]);
  } catch (err) { if (err.code === '23505') return res.status(409).json({ message: 'This player is already in that house' }); next(err); }
};

export const deleteHousePlayer = async (req, res, next) => {
  try {
    const houseResult = await query('SELECT id, leader_id FROM league_houses WHERE id=$1', [req.params.id]);
    if (!houseResult.rows.length) return res.status(404).json({ message: 'House not found' });
    if (!isManager(req) && houseResult.rows[0].leader_id !== req.user.id) return res.status(403).json({ message: 'Only this house leader or a league manager can remove its players' });
    const result = await query('DELETE FROM league_players WHERE id=$1 AND house_id=$2 RETURNING id', [req.params.playerId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Player not found in this house' });
    res.json({ message: 'Player removed from house' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ message: 'This player has scored a recorded goal and cannot be removed' });
    next(err);
  }
};

export const createFixture = async (req, res, next) => {
  if (!['sv_committee', 'committee'].includes(req.user.role)) return res.status(403).json({ message: 'Only the SV Committee can add fixtures' });
  const { homeHouseId, awayHouseId, gender, matchDate, venue } = req.body;
  if (!homeHouseId || !awayHouseId || homeHouseId === awayHouseId || !['girls','boys'].includes(gender)) return res.status(400).json({ message: 'Choose two different houses and a girls or boys category' });
  try {
    const result = await query(`INSERT INTO league_fixtures (home_house_id,away_house_id,gender,match_date,venue,created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [homeHouseId, awayHouseId, gender, matchDate || null, venue?.trim() || null, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { if (err.code === '23503') return res.status(400).json({ message: 'Choose existing houses' }); next(err); }
};

export const recordGoal = async (req, res, next) => {
  if (!['sv_committee', 'committee'].includes(req.user.role)) return res.status(403).json({ message: 'Only the SV Committee can record results' });
  const { playerId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fixture = await client.query('SELECT id, gender, status, home_house_id, away_house_id FROM league_fixtures WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!fixture.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Fixture not found' }); }
    const match = fixture.rows[0];
    if (match.status === 'completed') { await client.query('ROLLBACK'); return res.status(409).json({ message: 'This match is already complete' }); }
    const scorer = await client.query('SELECT id, house_id, gender FROM league_players WHERE id=$1', [playerId]);
    if (!scorer.rows.length || ![match.home_house_id, match.away_house_id].includes(scorer.rows[0].house_id) || scorer.rows[0].gender !== match.gender) {
      await client.query('ROLLBACK'); return res.status(400).json({ message: 'Choose an eligible player from either house in the matching category' });
    }
    const goal = await client.query('INSERT INTO league_goals (fixture_id,player_id,scored_by) VALUES ($1,$2,$3) RETURNING id', [match.id, playerId, req.user.id]);
    await client.query('COMMIT');
    res.status(201).json(goal.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
};

export const deleteGoal = async (req, res, next) => {
  if (!['sv_committee', 'committee'].includes(req.user.role)) return res.status(403).json({ message: 'Only the SV Committee can edit results' });
  try {
    const result = await query('DELETE FROM league_goals WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal removed' });
  } catch (err) { next(err); }
};

export const completeFixture = async (req, res, next) => {
  if (!['sv_committee', 'committee'].includes(req.user.role)) return res.status(403).json({ message: 'Only the SV Committee can finalize results' });
  try {
    const result = await query(`UPDATE league_fixtures SET status='completed' WHERE id=$1 AND status='upcoming' RETURNING id`, [req.params.id]);
    if (!result.rows.length) {
      const existing = await query('SELECT id FROM league_fixtures WHERE id=$1', [req.params.id]);
      return res.status(existing.rows.length ? 409 : 404).json({ message: existing.rows.length ? 'This match is already complete' : 'Fixture not found' });
    }
    res.json({ message: 'Result finalized' });
  } catch (err) { next(err); }
};
