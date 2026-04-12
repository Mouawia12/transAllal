export class ApiConfigurationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationException';
  }
}
