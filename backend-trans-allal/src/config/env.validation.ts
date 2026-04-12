type EnvironmentRecord = Record<string, unknown>;

const numericKeys = ['PORT', 'REDIS_PORT', 'WS_PORT'] as const;

export function validateEnvironment(
  config: EnvironmentRecord,
): EnvironmentRecord {
  const errors: string[] = [];

  for (const key of numericKeys) {
    const value = config[key];

    if (value === undefined || value === '') {
      continue;
    }

    if (Number.isNaN(Number(value))) {
      errors.push(`${key} must be a valid number`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  return config;
}
