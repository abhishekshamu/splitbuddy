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
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Trust Render's proxy for accurate rate limiting and IP detection
app.set('trust proxy', 1);

// ── Security & Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(compression());
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? [...process.env.ALLOWED_ORIGINS.split(','), ...defaultOrigins] 
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ── Health Check & Root Endpoints ────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'SplitBuddy API Service Ready' });
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 [SERVER] SplitBuddy API running on port ${PORT}`);
    console.log(`📊 [ENVIRONMENT] ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 [CORS] Configured for origins: ${allowedOrigins.join(', ')}`);
    console.log(`📡 [ROUTES] Mounted /api/auth, /api/groups, /api/expenses, /api/settle, /api/members, /api/utility, /api/reports, /api/notifications`);
    console.log(`🟢 [HEALTH] Check active at http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;

