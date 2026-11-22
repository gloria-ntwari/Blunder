import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { listRides, createRide, requestRide, decideRequest, joinRide, cancelRide, listSeatRequests, createSeatRequest, offerSeats, decideSeatOffer, cancelSeatRequest } from '../controllers/taxi.controller.js';

const router = express.Router();
router.use(authenticate);
router.get('/', listRides);
router.post('/', createRide);
router.post('/:id/requests', requestRide);
router.put('/:id/requests/:requestId', decideRequest);
router.post('/:id/join', joinRide);
router.delete('/:id', cancelRide);
router.get('/seat-requests', listSeatRequests);
router.post('/seat-requests', createSeatRequest);
router.post('/seat-requests/:id/offers', offerSeats);
router.put('/seat-requests/:id/offers/:offerId', decideSeatOffer);
router.delete('/seat-requests/:id', cancelSeatRequest);
export default router;
