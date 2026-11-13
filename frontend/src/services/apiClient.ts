const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
export const apiClient = {
  async get<T>(path: string): Promise<{ data: T }> {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return { data: await response.json() as T };
  },
};
