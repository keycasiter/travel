import { API_BASE_URL } from './config';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

export function request<T>(path: string, method: Method = 'GET', data?: unknown): Promise<T> {
  const userId = wx.getStorageSync('userId') as number | '';
  return new Promise<T>((resolve, reject) => {
    wx.request<Envelope<T>>({
      url: `${API_BASE_URL}${path}`,
      method: method as unknown as WechatMiniprogram.RequestOption['method'],
      data: data as WechatMiniprogram.IAnyObject,
      header: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-ID': String(userId) } : {})
      },
      success: (res) => {
        if (res.statusCode >= 400 || res.data?.error) {
          reject(new Error(res.data?.error?.message || `HTTP ${res.statusCode}`));
          return;
        }
        resolve(res.data?.data as T);
      },
      fail: (err) => reject(err)
    });
  });
}
