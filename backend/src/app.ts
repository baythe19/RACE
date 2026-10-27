import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/src/error';
import { loggerMiddleware } from './middleware/src/logger';
import { globalRateLimiter } from './middleware/src/rateLimiter';
import apiRoutes from './controller/src/routesIndex';
import healthRoutes from './controller/src/healthRoutes';
import qaBootstrapRoutes from './controller/src/qaBootstrapRoutes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // BUG-15: in production an open CORS reflect-with-credentials is not
      // acceptable — force an explicit allowlist. Dev keeps the permissive
      // default so local Expo/web previews keep working.
      origin:
        env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*'
          ? false // no CORS headers; same-origin/native apps unaffected
          : env.CORS_ORIGIN === '*'
            ? true
            : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(loggerMiddleware);
  app.use(globalRateLimiter);

  // BUG-02/P0.4: the unauthenticated /uploads static route is GONE.
  // Documents are now served only through the gated /api/v1/documents proxy.

  app.use('/health', healthRoutes);
  app.use(env.API_PREFIX, qaBootstrapRoutes);
  app.use(apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
