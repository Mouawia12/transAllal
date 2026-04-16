import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

function assertMysqlDatabaseUrl(
  url: string,
): Extract<TypeOrmModuleOptions['type'], 'mysql'> {
  if (url.startsWith('mysql://')) {
    return 'mysql';
  }

  throw new Error(
    'DATABASE_URL must start with mysql://. The backend runtime is standardized on MySQL/MariaDB.',
  );
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const url = config.get<string>('database.url') ?? '';
        const appEnv = config.get<string>('app.env') ?? 'development';
        const type = assertMysqlDatabaseUrl(url);

        const mysqlOptions: TypeOrmModuleOptions = {
          type,
          url,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          // Never auto-sync: schema changes must go through migrations.
          // Use `npm run migration:run` or `npm run migration:fresh`.
          synchronize: false,
          logging: appEnv === 'development',
        };

        return mysqlOptions;
      },
    }),
  ],
})
export class DatabaseModule {}
