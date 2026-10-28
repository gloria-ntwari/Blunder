import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './src/middlewares/errorHandler.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/users.routes.js';
import foodRoutes from './src/routes/food.routes.js';
import announcementRoutes from './src/routes/announcements.routes.js';
import lostFoundRoutes from './src/routes/lostandfound.routes.js';
import eventRoutes from './src/routes/events.routes.js';
import deadlineRoutes from './src/routes/deadlines.routes.js';
import notificationRoutes from './src/routes/notifications.routes.js';
import mentorGroupRoutes from './src/routes/mentorGroups.routes.js';
import { initSocket } from './src/socket/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible via req
app.set('io', io);
initSocket(io);

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mentor-groups', mentorGroupRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 B- Lunder server running on port ${PORT}`);
});
