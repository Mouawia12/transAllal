let inMemoryToken: string | null = null;

export const tokenStorage = {
  async get() {
    return inMemoryToken;
  },
  async set(token: string) {
    inMemoryToken = token;
  },
  async clear() {
    inMemoryToken = null;
  },
};
