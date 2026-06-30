"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = request;
const config_1 = require("./config");
function request(path, method = 'GET', data) {
    const userId = wx.getStorageSync('userId');
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${config_1.API_BASE_URL}${path}`,
            method: method,
            data: data,
            timeout: 6000,
            header: {
                'Content-Type': 'application/json',
                ...(userId ? { 'X-User-ID': String(userId) } : {})
            },
            success: (res) => {
                if (res.statusCode >= 400 || res.data?.error) {
                    reject(new Error(res.data?.error?.message || `HTTP ${res.statusCode}`));
                    return;
                }
                resolve(res.data?.data);
            },
            fail: (err) => reject(err)
        });
    });
}
