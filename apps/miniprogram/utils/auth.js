"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserId = ensureUserId;
const api_1 = require("./api");
async function ensureUserId() {
    const existing = wx.getStorageSync('userId');
    if (existing) {
        return Number(existing);
    }
    const login = await wxLogin();
    const result = await (0, api_1.request)('/api/v1/auth/wechat-login', 'POST', { code: login.code || 'dev-code' });
    wx.setStorageSync('userId', result.userId);
    return result.userId;
}
function wxLogin(timeoutMs = 5000) {
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
