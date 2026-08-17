import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HealthResponse } from '@larry/shared';
import { prisma } from '@larry/database';

dotenv.config({ path: '../../.env' });

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(express.json());

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Basic Health Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Larry Control API is running',
  };

  res.json(response);
});

// Start backend only after PostgreSQL connection succeeds.
async function startServer() {
  try {
    await prisma.$connect();

    console.log(
      '[Backend] Successfully connected to PostgreSQL via Prisma.'
    );

    app.listen(port, () => {
      console.log(
        `[Backend] Server is running on http://localhost:${port}`
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    console.error(
      '[Backend] Failed to connect to the database:',
      message
    );

    process.exit(1);
  }
}

startServer();
