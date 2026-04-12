import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ??
    'mysql://mouawia:mouawia@localhost:3306/trans-allal-db',
  businessSchema: 'business',
  telemetrySchema: 'telemetry',
}));
