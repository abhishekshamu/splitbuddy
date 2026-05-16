/**
 * SplitBuddy Backend – server.js
 * Node.js + Express + Supabase (PostgreSQL)
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const groupRoutes    = require('./routes/groups');
const expenseRoutes  = require('./routes/expenses');
const settleRoutes   = require('./routes/settle');
const memberRoutes   = require('./routes/members');
const utilityRoutes  = require('./routes/utilities');
// const aiRoutes       = require('./routes/ai');
const reportRoutes   = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const connectDB        = require('./config/mongodb');

// Initialize MongoDB
connectDB();

const app = express();

// ── Security & Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 1000, // Allow 1000 requests per minute
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100, // Allow 100 auth attempts per 5 mins
  message: { error: 'Too many auth attempts.' },
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('/', (req, res) => {
  res.send('🚀 SplitBuddy API is live! Please use the frontend to interact with the service.');
});

// ── Public Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Protected Routes ──────────────────────────────────────────────
app.use('/api/groups',   authenticate, groupRoutes);
app.use('/api/expenses', authenticate, expenseRoutes);
app.use('/api/settle',   authenticate, settleRoutes);
app.use('/api/members',  authenticate, memberRoutes);
app.use('/api/utility',  authenticate, utilityRoutes);
// app.use('/api/ai',       authenticate, aiRoutes);
app.use('/api/reports',  authenticate, reportRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// ── 404 Fallback ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SplitBuddy API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

