"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
Component({
    properties: {
        regions: {
            type: Array,
            value: []
        },
        selectedRegionId: {
            type: String,
            value: ''
        }
    },
    data: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        touchState: null
    },
    lifetimes: {
        ready() {
            this.drawInkMap();
        }
    },
    observers: {
        regions() {
            this.drawInkMap();
        }
    },
    methods: {
        drawInkMap() {
            const query = this.createSelectorQuery();
            query.select('#inkCanvas').fields({ node: true, size: true }).exec((res) => {
                const canvas = res?.[0]?.node;
                if (!canvas) {
                    return;
                }
                const width = Number(res[0].width || 320);
                const height = Number(res[0].height || 520);
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, width, height);
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#fbf6e8');
                gradient.addColorStop(1, '#e7dcc3');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                ctx.save();
                ctx.translate(width / 2 + this.data.offsetX, height * 0.45 + this.data.offsetY);
                ctx.scale(this.data.scale, this.data.scale);
                ctx.rotate(-0.12);
                ctx.fillStyle = 'rgba(34, 88, 76, 0.82)';
                ctx.shadowColor = 'rgba(31, 54, 49, 0.26)';
                ctx.shadowBlur = 24;
                ctx.beginPath();
                ctx.ellipse(0, 0, width * 0.32, height * 0.17, -0.18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(182, 153, 92, 0.22)';
                ctx.beginPath();
                ctx.ellipse(width * 0.08, height * 0.02, width * 0.22, height * 0.1, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        },
        tapRegion(event) {
            const regionId = String(event.currentTarget.dataset.id || '');
            if (regionId) {
                this.triggerEvent('regiontap', { regionId });
            }
        },
        locate() {
            this.triggerEvent('locate');
        },
        touchStart(event) {
            const touches = event.touches;
            if (touches.length === 1) {
                this.setData({
                    touchState: {
                        startX: touches[0].clientX,
                        startY: touches[0].clientY,
                        startDistance: 0
                    }
                });
                return;
            }
            if (touches.length >= 2) {
                this.setData({
                    touchState: {
                        startX: touches[0].clientX,
                        startY: touches[0].clientY,
                        startDistance: distance(touches[0], touches[1])
                    }
                });
            }
        },
        touchMove(event) {
            const state = this.data.touchState;
            if (!state) {
                return;
            }
            const touches = event.touches;
            if (touches.length === 1) {
                this.setData({
                    offsetX: this.data.offsetX + (touches[0].clientX - state.startX) * 0.08,
                    offsetY: this.data.offsetY + (touches[0].clientY - state.startY) * 0.08
                });
                this.drawInkMap();
                return;
            }
            if (touches.length >= 2 && state.startDistance > 0) {
                const next = distance(touches[0], touches[1]);
                const scale = Math.max(0.8, Math.min(2.2, this.data.scale + (next - state.startDistance) / 360));
                this.setData({ scale });
                this.drawInkMap();
            }
        }
    }
});
function distance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
