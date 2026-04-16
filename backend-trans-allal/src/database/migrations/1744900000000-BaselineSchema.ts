import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Baseline migration for the current MySQL/MariaDB runtime.
 * Creates the full schema from scratch.
 * Run with: npm run migration:run
 * Full reset with: npm run migration:fresh
 * Revert with: npm run migration:revert
 */
export class BaselineSchema1744900000000 implements MigrationInterface {
  name = 'BaselineSchema1744900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── companies ────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'companies',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'tax_id', type: 'varchar', length: '50', isNullable: true, isUnique: true },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'email', type: 'varchar', length: '150', isNullable: true, isUnique: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'is_active', type: 'tinyint', width: 1, default: 1 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // ── users ─────────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'company_id', type: 'char', length: '36', isNullable: true },
          { name: 'email', type: 'varchar', length: '150', isNullable: true, isUnique: true },
          { name: 'password', type: 'varchar', length: '255', isNullable: false },
          { name: 'first_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'role', type: 'varchar', length: '30', isNullable: false },
          { name: 'is_active', type: 'tinyint', width: 1, default: 1 },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ── drivers ───────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'drivers',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'company_id', type: 'char', length: '36', isNullable: false },
          { name: 'user_id', type: 'char', length: '36', isNullable: false, isUnique: true },
          { name: 'first_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'phone', type: 'varchar', length: '20', isNullable: false, isUnique: true },
          { name: 'license_number', type: 'varchar', length: '80', isNullable: false, isUnique: true },
          { name: 'license_expiry', type: 'date', isNullable: false },
          { name: 'push_token', type: 'text', isNullable: true },
          { name: 'is_active', type: 'tinyint', width: 1, default: 1 },
          { name: 'is_online', type: 'tinyint', width: 1, default: 0 },
          { name: 'last_seen_at', type: 'timestamp', isNullable: true },
          { name: 'session_started_at', type: 'timestamp', isNullable: true },
          { name: 'battery_level', type: 'numeric', precision: 5, scale: 2, isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'drivers',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'drivers',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ── trucks ────────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'trucks',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'company_id', type: 'char', length: '36', isNullable: false },
          { name: 'plate_number', type: 'varchar', length: '30', isNullable: false, isUnique: true },
          { name: 'brand', type: 'varchar', length: '100', isNullable: true },
          { name: 'model', type: 'varchar', length: '100', isNullable: true },
          { name: 'year', type: 'smallint', isNullable: true },
          { name: 'capacity_tons', type: 'numeric', precision: 8, scale: 2, isNullable: true },
          { name: 'is_active', type: 'tinyint', width: 1, default: 1 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'trucks',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ── trips ─────────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'trips',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'company_id', type: 'char', length: '36', isNullable: false },
          { name: 'driver_id', type: 'char', length: '36', isNullable: true },
          { name: 'truck_id', type: 'char', length: '36', isNullable: true },
          { name: 'origin', type: 'varchar', length: '255', isNullable: false },
          { name: 'destination', type: 'varchar', length: '255', isNullable: false },
          { name: 'origin_lat', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'origin_lng', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'destination_lat', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'destination_lng', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'scheduled_at', type: 'timestamp', isNullable: false },
          { name: 'started_at', type: 'timestamp', isNullable: true },
          { name: 'completed_at', type: 'timestamp', isNullable: true },
          { name: 'status', type: 'varchar', length: '30', default: "'PENDING'" },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'trips',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'trips',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'trips',
      new TableForeignKey({
        columnNames: ['truck_id'],
        referencedTableName: 'trucks',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ── alerts ────────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'alerts',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'company_id', type: 'char', length: '36', isNullable: false },
          { name: 'driver_id', type: 'char', length: '36', isNullable: true },
          { name: 'trip_id', type: 'char', length: '36', isNullable: true },
          { name: 'type', type: 'varchar', length: '50', isNullable: false },
          { name: 'severity', type: 'varchar', length: '20', isNullable: false },
          { name: 'message', type: 'text', isNullable: true },
          { name: 'is_read', type: 'tinyint', width: 1, default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'alerts',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'alerts',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'alerts',
      new TableForeignKey({
        columnNames: ['trip_id'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ── refresh_tokens ────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true },
          { name: 'user_id', type: 'char', length: '36', isNullable: false },
          { name: 'token_hash', type: 'varchar', length: '255', isNullable: false, isUnique: true },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'revoked_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ── driver_locations ──────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_locations',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'driver_id', type: 'char', length: '36', isNullable: false },
          { name: 'trip_id', type: 'char', length: '36', isNullable: true },
          { name: 'lat', type: 'numeric', precision: 10, scale: 7, isNullable: false },
          { name: 'lng', type: 'numeric', precision: 10, scale: 7, isNullable: false },
          { name: 'speed_kmh', type: 'numeric', precision: 5, scale: 1, isNullable: true },
          { name: 'heading', type: 'smallint', isNullable: true },
          { name: 'accuracy_m', type: 'numeric', precision: 6, scale: 1, isNullable: true },
          { name: 'battery_level', type: 'numeric', precision: 5, scale: 2, isNullable: true },
          { name: 'recorded_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'driver_locations',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'driver_locations',
      new TableForeignKey({
        columnNames: ['trip_id'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Telemetry indexes: latest-location and history queries
    await queryRunner.createIndex(
      'driver_locations',
      new TableIndex({
        name: 'idx_driver_locations_driver_recorded',
        columnNames: ['driver_id', 'recorded_at'],
      }),
    );
    await queryRunner.createIndex(
      'driver_locations',
      new TableIndex({
        name: 'idx_driver_locations_trip_recorded',
        columnNames: ['trip_id', 'recorded_at'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('driver_locations', true);
    await queryRunner.dropTable('refresh_tokens', true);
    await queryRunner.dropTable('alerts', true);
    await queryRunner.dropTable('trips', true);
    await queryRunner.dropTable('trucks', true);
    await queryRunner.dropTable('drivers', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('companies', true);
  }
}
