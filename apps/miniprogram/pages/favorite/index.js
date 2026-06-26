"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
Page({
    data: {
        favorites: [],
        status: '沉淀想去的片区、景点、路线和精选攻略。'
    },
    onShow() {
        this.loadFavorites();
    },
    async loadFavorites() {
        try {
            const favorites = await (0, api_1.request)('/api/v1/favorites');
            this.setData({ favorites, status: favorites.length ? '已收藏内容' : '还没有收藏。去探索地图中收藏景点、攻略或片区。' });
        }
        catch (error) {
            this.setData({ status: error instanceof Error ? error.message : String(error) });
        }
    }
});
