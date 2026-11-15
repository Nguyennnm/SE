const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const apiClient = {
  async get<T>(path: string, options: { signal?: AbortSignal } = {}): Promise<{ data: T }> {
    const timeout = AbortSignal.timeout(15000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { signal });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(timeout.aborted ? 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.' : 'Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy tại cổng 5000.', 0);
    }
    const data = await response.json();
    if (!response.ok || data.success === false) throw new ApiError(data.error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.', response.status);
    return { data: data as T };
  },
};
