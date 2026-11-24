const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T }> {
  const timeout = AbortSignal.timeout(15000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(timeout.aborted ? 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.' : 'Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy tại cổng 5000.', 0);
  }
  const data = await response.json();
  if (!response.ok || data.success === false) throw new ApiError(data.error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.', response.status);
  return { data: data as T };
}

export const apiClient = {
  get: <T>(path: string, options: Pick<RequestOptions, 'signal' | 'headers'> = {}) => request<T>(path, options),
  request,
};
