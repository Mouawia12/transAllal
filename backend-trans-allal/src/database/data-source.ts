/**
 * Standalone TypeORM DataSource used by the TypeORM CLI for generating and
 * running migrations. The application itself uses DatabaseModule (TypeOrmModule)
 * to connect at runtime; this file is only for CLI operations:
 *
 *   npm run migration:generate -- src/database/migrations/MigrationName
 *   npm run migration:run
 *   npm run migration:revert
 *
 * Reads the same DATABASE_URL env var as the rest of the app.
 * Load a .env file before running if you are not exporting the variable:
 *   DATABASE_URL=... npm run migration:run
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

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
