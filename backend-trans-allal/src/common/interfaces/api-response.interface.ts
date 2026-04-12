export interface ApiResponse<TData> {
  status: 'ok' | 'error';
  message?: string;
  data?: TData;
  timestamp: string;
}
