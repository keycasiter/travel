"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MAP_HERO_IMAGE = '/assets/maps/china-relief-home.jpg';
const MIN_HERO_SCALE = 1;
const MAX_HERO_SCALE = 1.35;
const DEFAULT_CITY_SCALE = 1.18;
const MAX_PAN_RPX = 160;
const DISCOVERY_CHIPS = [
    { id: 'landmark', label: '地标' },
    { id: 'scenic', label: '景观' },
    { id: 'food', label: '美食' },
    { id: 'transport', label: '交通' },
    { id: 'inspiration', label: '灵感' }
];
const CITY_HOTSPOTS = [
    {
        id: 'city-beijing',
        name: '北京',
        x: 67,
        y: 33,
        recommendedDays: '3-5 天',
        mood: '中轴线、宫城与胡同慢行',
        summary: '适合把故宫、景山、胡同和博物馆串成历史文化路线，热门场馆重点看预约。',
        tags: ['历史文化', '预约提醒', '城市漫步'],
        notes: {
            landmark: '故宫、天坛、中轴线是首轮必看，建议早场进入核心景点。',
            scenic: '景山和北海适合接在故宫后，傍晚看城市轮廓更稳。',
            food: '烤鸭和胡同小吃分开安排，热门正餐提前订位。',
            transport: '核心区优先地铁加步行，景点周边打车等待成本高。',
            inspiration: '把一天留给博物馆或长城，不要和故宫同天硬塞。'
        }
    },
    {
        id: 'city-shanghai',
        name: '上海',
        x: 76,
        y: 52,
        recommendedDays: '2-4 天',
        mood: '江岸夜景、海派街区与展馆',
        summary: '外滩、豫园、人民广场和陆家嘴适合按半日模块组合，雨天也有室内替代。',
        tags: ['夜景', '城市漫步', '地铁友好'],
        notes: {
            landmark: '外滩和陆家嘴适合傍晚到夜间，留足过江时间。',
            scenic: '豫园、苏州河和武康路可按老城与街区两条线拆开。',
            food: '黄浦热门餐厅排队明显，景观位建议提前锁定。',
            transport: '地铁覆盖核心城区，雨天优先地铁减少步行折返。',
            inspiration: '把外滩夜景放在第一晚，后续行程更容易取舍。'
        }
    },
    {
        id: 'city-hangzhou',
        name: '杭州',
        x: 73,
        y: 55,
        recommendedDays: '2-3 天',
        mood: '湖山、寺院与茶田慢游',
        summary: '西湖适合清晨或傍晚慢走，灵隐和龙井方向建议单独留半日。',
        tags: ['湖景', '轻松', '避峰'],
        notes: {
            landmark: '西湖苏堤、断桥和湖滨是首轮重点，清晨体验更好。',
            scenic: '灵隐、九溪和龙井适合晴天慢游，雨天缩短户外湖线。',
            food: '湖滨和南山路餐饮密集，茶歇可放在龙井村。',
            transport: '西湖核心区节假日少自驾，地铁到达后步行或公交接驳。',
            inspiration: '用一条湖线加一条山寺线，不要全天绕湖消耗体力。'
        }
    },
    {
        id: 'city-chengdu',
        name: '成都',
        x: 45,
        y: 59,
        recommendedDays: '3-5 天',
        mood: '烟火老城、茶馆与川味',
        summary: '宽窄巷子、武侯祠、锦里和熊猫基地适合松弛安排，重餐后留轻松段。',
        tags: ['美食', '慢游', '亲子'],
        notes: {
            landmark: '武侯祠、锦里和宽窄巷子适合串成老城半日线。',
            scenic: '熊猫基地建议早起单独安排，午后回城休整。',
            food: '火锅串串错峰更轻松，微辣也可能偏辣。',
            transport: '市区地铁加打车效率高，早晚高峰预留缓冲。',
            inspiration: '每天只放一个重体验，留茶馆和街区漫步时间。'
        }
    },
    {
        id: 'city-xian',
        name: '西安',
        x: 55,
        y: 48,
        recommendedDays: '2-4 天',
        mood: '古城墙、博物馆与夜色小吃',
        summary: '城墙、钟楼和碑林适合步行串联，兵马俑等远郊点位单独排半日以上。',
        tags: ['古城', '夜景', '避坑'],
        notes: {
            landmark: '城墙、钟楼和碑林是城内核心，傍晚骑行更舒服。',
            scenic: '兵马俑距离远，不建议和城内多个点位挤在同天。',
            food: '小吃街适合少量多样，注意碳水密度和排队。',
            transport: '城内步行加地铁，远郊景点用单独交通时段处理。',
            inspiration: '把夜景和小吃放在同一晚，白天留给历史点位。'
        }
    },
    {
        id: 'city-guangzhou',
        name: '广州',
        x: 62,
        y: 72,
        recommendedDays: '2-4 天',
        mood: '早茶、骑楼与岭南老城',
        summary: '越秀、荔湾、沙面和珠江两岸适合慢慢串，午后雷雨季准备室内替代。',
        tags: ['早茶', '老城', '岭南'],
        notes: {
            landmark: '越秀公园、沙面和珠江夜景适合分成白天与夜间两段。',
            scenic: '老城骑楼适合步行，夏季避开正午暴晒。',
            food: '早茶热门店排队明显，上午行程要留弹性。',
            transport: '地铁覆盖强，老城片区步行体验更好。',
            inspiration: '早茶后安排轻量街区，不要立刻接高强度户外。'
        }
    },
    {
        id: 'city-shenzhen',
        name: '深圳',
        x: 64,
        y: 75,
        recommendedDays: '2-3 天',
        mood: '滨海公园、城市更新与夜景',
        summary: '南山滨海、人才公园和南头古城适合组合，周末海边停车压力大。',
        tags: ['滨海', '夜景', '地铁'],
        notes: {
            landmark: '人才公园和湾区天际线适合傍晚到夜间。',
            scenic: '滨海步道适合骑行或慢走，夏季注意防晒补水。',
            food: '商圈餐饮集中，海岸线行程适合安排轻餐和咖啡。',
            transport: '南山和福田地铁便利，海边周末少依赖自驾。',
            inspiration: '白天看城市更新街区，晚上收在滨海夜景。'
        }
    },
    {
        id: 'city-xiamen',
        name: '厦门',
        x: 72,
        y: 68,
        recommendedDays: '2-4 天',
        mood: '海岛、老港口与慢节奏街区',
        summary: '鼓浪屿、沙坡尾和环岛路适合慢游，船票和海鲜价格是主要避坑点。',
        tags: ['海滨', '慢游', '船票'],
        notes: {
            landmark: '鼓浪屿建议留足半天以上，提前确认船票和返程时间。',
            scenic: '环岛路和海边适合晴天，台风季关注临时调整。',
            food: '海鲜先确认价格，小吃和正餐分开安排更稳。',
            transport: '岛内距离不大，公交打车结合，轮渡时间要前置规划。',
            inspiration: '把沙坡尾放到傍晚，老港口、咖啡和夜色更顺。'
        }
    }
];
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragging = false;
Component({
    properties: {
        regions: {
            type: Array,
            value: []
        },
        selectedRegionId: {
            type: String,
            value: ''
        },
        currentLocation: {
            type: Object,
            value: {}
        }
    },
    data: {
        heroImage: MAP_HERO_IMAGE,
        heroScale: MIN_HERO_SCALE,
        heroOffsetX: 0,
        heroOffsetY: 0,
        cityHotspots: CITY_HOTSPOTS,
        discoveryChips: DISCOVERY_CHIPS,
        activeDiscoveryId: 'inspiration',
        searchKeyword: '',
        selectedCityId: '',
        selectedCityCard: null
    },
    observers: {
        selectedRegionId(regionId) {
            if (regionId && regionId !== this.data.selectedCityId) {
                this.focusRegion(regionId);
            }
        }
    },
    methods: {
        locate() {
            this.triggerEvent('locate');
        },
        handleSearchInput(event) {
            this.setData({ searchKeyword: String(event.detail.value || '') });
        },
        submitSearch() {
            const keyword = String(this.data.searchKeyword || '').trim();
            if (!keyword) {
                wx.showToast({ title: '输入想找的城市', icon: 'none' });
                return;
            }
            const matched = findCityByKeyword(keyword, getRegions(this.data.regions));
            if (!matched) {
                wx.showToast({ title: '先支持 8 个种子城市', icon: 'none' });
                return;
            }
            this.focusRegion(matched.id);
        },
        tapDiscoveryChip(event) {
            const chipId = String(event.currentTarget.dataset.id || '');
            if (!isDiscoveryId(chipId)) {
                return;
            }
            const selectedCityId = String(this.data.selectedCityId || '');
            this.setData({ activeDiscoveryId: chipId });
            if (selectedCityId) {
                this.setData({ selectedCityCard: buildSelectedCityCard(selectedCityId, chipId) });
                return;
            }
            wx.showToast({ title: '先点一个城市', icon: 'none' });
        },
        tapCityHotspot(event) {
            const cityId = String(event.currentTarget.dataset.id || '');
            this.focusRegion(cityId);
        },
        enterCityDetail(event) {
            const cityId = String(event.currentTarget.dataset.id || this.data.selectedCityId || '');
            if (!cityId) {
                return;
            }
            this.triggerEvent('regiontap', { regionId: cityId });
        },
        goPlan(event) {
            const cityId = String(event.currentTarget.dataset.id || this.data.selectedCityId || '');
            if (cityId) {
                wx.setStorageSync('pendingDestinationRegionId', cityId);
            }
            wx.switchTab({ url: '/pages/itinerary/index' });
        },
        closeCityCard() {
            this.setData({ selectedCityCard: null, selectedCityId: '' });
        },
        zoomHeroMap(event) {
            const delta = Number(event.currentTarget.dataset.delta || 0);
            const nextScale = clampScale(Number(this.data.heroScale) + delta * 0.08);
            this.setData({ heroScale: nextScale });
        },
        resetHeroMap() {
            this.setData({
                heroScale: MIN_HERO_SCALE,
                heroOffsetX: 0,
                heroOffsetY: 0,
                selectedCityId: '',
                selectedCityCard: null
            });
        },
        onMapTouchStart(event) {
            const touch = firstTouch(event);
            if (!touch) {
                return;
            }
            dragging = true;
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            dragOriginX = Number(this.data.heroOffsetX || 0);
            dragOriginY = Number(this.data.heroOffsetY || 0);
        },
        onMapTouchMove(event) {
            if (!dragging) {
                return;
            }
            const touch = firstTouch(event);
            if (!touch) {
                return;
            }
            const deltaX = (touch.clientX - dragStartX) * 2;
            const deltaY = (touch.clientY - dragStartY) * 2;
            this.setData({
                heroOffsetX: clampPan(dragOriginX + deltaX),
                heroOffsetY: clampPan(dragOriginY + deltaY)
            });
        },
        onMapTouchEnd() {
            dragging = false;
        },
        focusRegion(regionId) {
            const city = findCityById(regionId);
            if (!city) {
                return;
            }
            this.setData({
                heroScale: DEFAULT_CITY_SCALE,
                heroOffsetX: clampPan((50 - city.x) * 5),
                heroOffsetY: clampPan((50 - city.y) * 5),
                selectedCityId: city.id,
                selectedCityCard: buildSelectedCityCard(city.id, this.data.activeDiscoveryId),
                searchKeyword: city.name
            });
        },
        focusLocation(_location) {
            const selectedRegionId = String(this.data.selectedRegionId || '');
            if (selectedRegionId) {
                this.focusRegion(selectedRegionId);
            }
        }
    }
});
function getRegions(rawRegions) {
    return Array.isArray(rawRegions) ? rawRegions.filter(isValidRegion) : [];
}
function isValidRegion(region) {
    const item = region;
    return !!item && typeof item.id === 'string' && typeof item.name === 'string';
}
function findCityByKeyword(keyword, regions) {
    const normalized = keyword.toLowerCase();
    return (CITY_HOTSPOTS.find((city) => {
        const region = regions.find((item) => item.id === city.id);
        return (city.name.includes(keyword) ||
            city.tags.some((tag) => tag.includes(keyword)) ||
            city.id.toLowerCase().includes(normalized) ||
            !!region?.name.includes(keyword));
    }) || null);
}
function findCityById(regionId) {
    return CITY_HOTSPOTS.find((city) => city.id === regionId) || null;
}
function buildSelectedCityCard(cityId, discoveryId) {
    const city = findCityById(cityId);
    const chip = DISCOVERY_CHIPS.find((item) => item.id === discoveryId) || DISCOVERY_CHIPS[DISCOVERY_CHIPS.length - 1];
    if (!city) {
        return null;
    }
    return {
        ...city,
        activeDiscoveryLabel: chip.label,
        activeDiscoveryNote: city.notes[chip.id]
    };
}
function isDiscoveryId(value) {
    return DISCOVERY_CHIPS.some((item) => item.id === value);
}
function firstTouch(event) {
    const touches = event.touches || [];
    return touches.length > 0 ? touches[0] : null;
}
function clampScale(scale) {
    return Math.max(MIN_HERO_SCALE, Math.min(MAX_HERO_SCALE, Number(scale.toFixed(2))));
}
function clampPan(value) {
    return Math.max(-MAX_PAN_RPX, Math.min(MAX_PAN_RPX, Math.round(value)));
}
