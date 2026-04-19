import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import listingsRouter from './routes/listings';
import searchRouter from './routes/search';
import authRouter from './routes/auth';
import { verifyToken } from './middleware/auth';
import { initDb, closeDb } from './services/db';

const app = express();
const PORT = process.env.PORT ?? 3001;

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(verifyToken);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/search', searchRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'UrbanLease NYC API', timestamp: new Date().toISOString() });
});

initDb().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`\nUrbanLease NYC API  →  http://localhost:${PORT}\n`);
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});

export default app;
