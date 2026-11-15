export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  pagination?: ApiResponse<T>['pagination']
): ApiResponse<T> {
  const res: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) res.message = message;
  if (pagination) res.pagination = pagination;
  return res;
}

