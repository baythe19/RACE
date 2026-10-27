import './config/env';
import { createApp } from './app';
import { createServer } from 'http';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectCache, disconnectCache } from './config/cache';
import { env } from './config/env';
import { assertProductionConfig } from './config/productionGuard';
import { initializeSocket } from './services/src/socket';
import { logger } from './utils/src/logger';

async function bootstrap(): Promise<void> {
  assertProductionConfig();
  await connectDatabase();
  const { ensureDatabaseIndexes } = await import('./database/src/indexes');
  await ensureDatabaseIndexes();
  await connectCache();

  const app = createApp();
  const httpServer = createServer(app);
  initializeSocket(httpServer);

  const server = httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`RACE API running on port ${env.PORT}`, {
      env: env.NODE_ENV,
      apiPrefix: env.API_PREFIX,
      urls: [`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`],
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectCache();
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: Error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
