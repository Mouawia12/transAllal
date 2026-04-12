export interface DatabaseReadinessDescriptor {
  domain: 'admin-business' | 'tracking-telemetry';
  connectionName: string;
  strategy: 'relational' | 'timeseries';
}

export const DATABASE_READINESS_DESCRIPTORS: DatabaseReadinessDescriptor[] = [
  {
    domain: 'admin-business',
    connectionName: 'business-primary',
    strategy: 'relational',
  },
  {
    domain: 'tracking-telemetry',
    connectionName: 'telemetry-primary',
    strategy: 'timeseries',
  },
];
