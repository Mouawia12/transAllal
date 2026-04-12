export function formatTimestamp(value?: string | null) {
  if (!value) {
    return 'not-synced-yet';
  }

  return new Date(value).toISOString();
}
