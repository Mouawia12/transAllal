/**
 * Standalone TypeORM DataSource for the TypeORM CLI.
 * Used for generating and running migrations — NOT used at runtime
 * (the app uses DatabaseModule / TypeOrmModule instead).
 *
 * Usage:
 *   npm run migration:run            # apply all pending migrations
 *   npm run migration:revert         # revert the latest migration
 *   npm run migration:generate -- src/database/migrations/MyChange
 *   npm run migration:show           # list applied / pending migrations
 *
 * Set DATABASE_URL before running, or create a .env file in the backend root:
 *   DATABASE_URL=mysql://user:pass@localhost:3306/trans-allal-db npm run migration:run
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Load .env if available (dotenv is a transitive dep of @nestjs/config)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv unavailable — rely on process.env being pre-populated
}

const databaseUrl =
  process.env.DATABASE_URL ??
  'mysql://mouawia:mouawia@localhost:3306/trans-allal-db';

function resolveDriver(url: string): 'mysql' | 'postgres' {
  if (url.startsWith('mysql://')) return 'mysql';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://'))
    return 'postgres';
  throw new Error(
    'DATABASE_URL must start with mysql://, postgres://, or postgresql://',
  );
}

const driver = resolveDriver(databaseUrl);

export const AppDataSource = new DataSource({
  type: driver,
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  ...(driver === 'postgres'
    ? {
        ssl:
          process.env.APP_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }
    : {}),
});
