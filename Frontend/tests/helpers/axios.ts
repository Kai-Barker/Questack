import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

// An axios error as the app would receive it: with a server response, or
// without one (the backend couldn't be reached)
export function axiosError(status?: number, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const response =
    status === undefined ? undefined : { status, statusText: '', data, headers: {}, config };
  return new AxiosError('Request failed', status === undefined ? 'ERR_NETWORK' : 'ERR_BAD_RESPONSE', config, {}, response);
}
