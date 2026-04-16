import express from 'express';
import cors from 'cors';
import listingsRouter from './routes/listings';
import searchRouter from './routes/search';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Routes
app.use('/api/listings', listingsRouter);
app.use('/api/search', searchRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'UrbanLease NYC API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\nUrbanLease NYC API  →  http://localhost:${PORT}\n`);
});

export default app;
