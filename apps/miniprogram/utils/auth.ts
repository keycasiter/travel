import { request } from './api';
import type { LoginResult } from './types';

export async function ensureUserId(): Promise<number> {
  const existing = wx.getStorageSync('userId') as number | string | '';
  if (existing) {
    return Number(existing);
  }

  const login = await wxLogin();
  const result = await request<LoginResult>('/api/v1/auth/wechat-login', 'POST', { code: login.code || 'dev-code' });
  wx.setStorageSync('userId', result.userId);
  return result.userId;
}

function wxLogin(timeoutMs = 5000): Promise<WechatMiniprogram.LoginSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new Error('wx.login timeout'));
    }, timeoutMs);

    wx.login({
      success: (res) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(res);
      },
      fail: (err) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}
