"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utils/config");
const api_1 = require("../../utils/api");
Page({
    data: {
        apiBaseUrl: config_1.API_BASE_URL,
        userId: '',
        itineraryCount: 0,
        status: '查看授权状态、已保存行程和本地开发配置。'
    },
    onShow() {
        this.loadMine();
    },
    async loadMine() {
        const userId = wx.getStorageSync('userId');
        if (!userId) {
            this.setData({ userId: '', itineraryCount: 0, status: '尚未建立本地用户身份。' });
            return;
        }
        try {
            const itineraries = await (0, api_1.request)('/api/v1/itineraries');
            this.setData({ userId: String(userId), itineraryCount: itineraries.length, status: '本地用户身份已建立。' });
        }
        catch (error) {
            this.setData({ userId: String(userId), status: error instanceof Error ? error.message : String(error) });
        }
    }
});
