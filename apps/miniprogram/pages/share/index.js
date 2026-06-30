"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const auth_1 = require("../../utils/auth");
Page({
    data: {
        shareCode: '',
        share: null,
        status: '加载分享行程'
    },
    onLoad(query) {
        this.setData({ shareCode: query.shareCode || '' });
        if (query.shareCode) {
            this.loadShare(query.shareCode);
        }
    },
    async loadShare(shareCode) {
        try {
            const share = await (0, api_1.request)(`/api/v1/shares/${shareCode}`);
            this.setData({ share, status: '只读行程已加载' });
        }
        catch (error) {
            this.setData({ status: error instanceof Error ? error.message : String(error) });
        }
    },
    async copyShare() {
        if (!this.data.shareCode) {
            return;
        }
        try {
            await (0, auth_1.ensureUserId)();
            await (0, api_1.request)(`/api/v1/shares/${this.data.shareCode}/copy`, 'POST');
            wx.switchTab({ url: '/pages/itinerary/index' });
        }
        catch (error) {
            this.setData({ status: error instanceof Error ? error.message : String(error) });
        }
    }
});
