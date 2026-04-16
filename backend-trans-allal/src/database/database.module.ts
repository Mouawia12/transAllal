import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

function resolveDatabaseType(
  url: string,
): Extract<TypeOrmModuleOptions['type'], 'mysql' | 'postgres'> {
  if (url.startsWith('mysql://')) {
    return 'mysql';
  }

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgres';
  }

  throw new Error(
    'DATABASE_URL must start with mysql://, postgres://, or postgresql://',
  );
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const url = config.get<string>('database.url') ?? '';
        const appEnv = config.get<string>('app.env') ?? 'development';
        const type = resolveDatabaseType(url);

        if (type === 'postgres') {
          const postgresOptions: TypeOrmModuleOptions = {
            type: 'postgres',
            url,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            // Never auto-sync: schema changes must go through migrations.
            // Run `npm run migration:run` before deploying.
            synchronize: false,
            logging: appEnv === 'development',
            ssl:
              appEnv === 'production' ? { rejectUnauthorized: false } : false,
          };

          return postgresOptions;
        }

        const mysqlOptions: TypeOrmModuleOptions = {
          type: 'mysql',
          url,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          // Never auto-sync: schema changes must go through migrations.
          synchronize: false,
          logging: appEnv === 'development',
        };

        return mysqlOptions;
      },
    }),
  ],
})
export class DatabaseModule {}
