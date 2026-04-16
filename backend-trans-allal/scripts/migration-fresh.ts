import 'reflect-metadata';
import { createConnection } from 'mysql2/promise';
import { AppDataSource } from '../src/database/data-source';

function parseMysqlDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith('mysql://')) {
    throw new Error(
      'DATABASE_URL must start with mysql:// for migration:fresh.',
    );
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    databaseName,
  };
}

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    'mysql://mouawia:mouawia@localhost:3306/trans-allal-db';

  const { host, port, user, password, databaseName } =
    parseMysqlDatabaseUrl(databaseUrl);

  console.log(`[migration:fresh] Resetting database "${databaseName}"...`);

  const adminConnection = await createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await adminConnection.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await adminConnection.end();
  }

  console.log('[migration:fresh] Database recreated. Running migrations...');

  await AppDataSource.initialize();
  try {
    const migrations = await AppDataSource.runMigrations();
    const applied = migrations.map((migration) => migration.name).join(', ');
    console.log(
      applied
        ? `[migration:fresh] Applied migrations: ${applied}`
        : '[migration:fresh] No migrations were applied.',
    );
  } finally {
    await AppDataSource.destroy();
  }

  console.log('[migration:fresh] Done.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : error;
  console.error('[migration:fresh] Failed:', message);
  process.exitCode = 1;
});
