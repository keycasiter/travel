"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
Page({
    data: {
        destinations: [],
        destinationNames: [],
        selectedDestinationIndex: 0,
        selectedDestinationId: 'city-hangzhou',
        days: 2,
        preferencesText: '城市漫步,历史文化',
        currentItinerary: null,
        itineraries: [],
        weather: null,
        status: '选择目的地和天数，生成你的自由行计划。'
    },
    onLoad() {
        this.loadInitialData();
    },
    async loadInitialData() {
        await Promise.all([this.loadDestinations(), this.loadItineraries()]);
    },
    async loadDestinations() {
        try {
            const destinations = await (0, api_1.request)('/api/v1/regions?level=city');
            this.setData({
                destinations,
                destinationNames: destinations.map((item) => item.name),
                selectedDestinationId: destinations[0]?.id || 'city-hangzhou'
            });
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    async loadItineraries() {
        try {
            const itineraries = await (0, api_1.request)('/api/v1/itineraries');
            this.setData({ itineraries });
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    onDestinationChange(event) {
        const selectedDestinationIndex = Number(event.detail.value);
        const selected = this.data.destinations[selectedDestinationIndex];
        this.setData({
            selectedDestinationIndex,
            selectedDestinationId: selected?.id || this.data.selectedDestinationId
        });
    },
    onDaysInput(event) {
        const days = Math.max(1, Math.min(14, Number(event.detail.value) || 1));
        this.setData({ days });
    },
    onPreferencesInput(event) {
        this.setData({ preferencesText: event.detail.value });
    },
    async generate() {
        const preferences = this.data.preferencesText.split(',').map((item) => item.trim()).filter(Boolean);
        try {
            const currentItinerary = await (0, api_1.request)('/api/v1/itineraries/generate', 'POST', {
                destinationRegionId: this.data.selectedDestinationId,
                days: this.data.days,
                preferences
            });
            const weather = await (0, api_1.request)(`/api/v1/weather/summary?regionId=${this.data.selectedDestinationId}`);
            this.setData({ currentItinerary, weather, status: '行程已生成，可按天执行。' });
            await this.loadItineraries();
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    async toggleDone(event) {
        const id = Number(event.currentTarget.dataset.id);
        const done = event.currentTarget.dataset.done === 'true';
        try {
            await (0, api_1.request)(`/api/v1/itinerary-items/${id}`, 'PATCH', { done });
            await this.reloadCurrent();
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    async addNote(event) {
        const id = Number(event.currentTarget.dataset.id);
        const result = await wxShowModal('行程备注', '写下现场提醒或调整原因');
        if (!result.confirm) {
            return;
        }
        try {
            await (0, api_1.request)(`/api/v1/itinerary-items/${id}`, 'PATCH', { note: result.content || '' });
            await this.reloadCurrent();
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    async createShare() {
        const itineraryId = this.data.currentItinerary?.itinerary.id;
        if (!itineraryId) {
            return;
        }
        try {
            const share = await (0, api_1.request)(`/api/v1/itineraries/${itineraryId}/share`, 'POST');
            wx.navigateTo({ url: `/pages/share/index?shareCode=${share.shareCode}` });
        }
        catch (error) {
            this.setData({ status: messageOf(error) });
        }
    },
    async reloadCurrent() {
        const itineraryId = this.data.currentItinerary?.itinerary.id;
        if (!itineraryId) {
            return;
        }
        const currentItinerary = await (0, api_1.request)(`/api/v1/itineraries/${itineraryId}`);
        this.setData({ currentItinerary });
    }
});
function wxShowModal(title, placeholderText) {
    return new Promise((resolve) => {
        wx.showModal({
            title,
            editable: true,
            placeholderText,
            success: (res) => resolve(res)
        });
    });
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
