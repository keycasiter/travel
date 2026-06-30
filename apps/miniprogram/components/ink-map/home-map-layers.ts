import type { DiscoveryId } from './city-hotspots';

export type HomeMapLayer = 'national' | 'area' | 'poi';
export type HomeMapItemKind = 'city' | 'area' | 'poi';
export type HomeMapTargetType = 'region' | 'poi' | 'transport';

export interface HomeMapLayerItem {
  id: string;
  kind: HomeMapItemKind;
  title: string;
  subtitle: string;
  summary: string;
  x: number;
  y: number;
  category: DiscoveryId;
  categoryLabel: string;
  tags: string[];
  targetType: HomeMapTargetType;
  targetId: string;
  regionId: string;
  poiId?: string;
  duration: string;
  actionHint: string;
}

export const HOME_MAP_ZOOM_LEVELS = {
  nationalMax: 1.08,
  areaMin: 1.09,
  areaMax: 1.22,
  poiMin: 1.23,
  poiMax: 1.45
} as const;

export const HANGZHOU_CITY_MAP_ITEM: HomeMapLayerItem = {
  id: 'city-hangzhou',
  kind: 'city',
  title: '杭州',
  subtitle: '湖山、寺院与茶田慢游',
  summary: '杭州 MVP 已开放西湖、灵隐龙井、湖滨武林、上城老街、大运河和西溪片区，适合先跑通探索、行程、收藏和分享全流程。',
  x: 73,
  y: 55,
  category: 'inspiration',
  categoryLabel: '灵感',
  tags: ['杭州先行版', '2-3 天', '全流程'],
  targetType: 'region',
  targetId: 'city-hangzhou',
  regionId: 'city-hangzhou',
  duration: '2-3 天',
  actionHint: '进入杭州内容后可以查看街道地图、收藏点位并加入行程。'
};

export const HANGZHOU_AREAS: HomeMapLayerItem[] = [
  {
    id: 'area-hangzhou-westlake',
    kind: 'area',
    title: '西湖热门片区',
    subtitle: '苏堤、断桥、雷峰塔',
    summary: '首次到杭州最稳的湖线区域，适合清晨或傍晚慢走，节假日减少全天绕湖。',
    x: 72.6,
    y: 54.7,
    category: 'scenic',
    categoryLabel: '景观',
    tags: ['西湖', '地标', '城市漫步', '避峰'],
    targetType: 'region',
    targetId: 'area-hangzhou-westlake',
    regionId: 'area-hangzhou-westlake',
    duration: '半天到 1 天',
    actionHint: '适合放在杭州第一天，用苏堤或湖滨作为入口。'
  },
  {
    id: 'area-hangzhou-lingyin-longjing',
    kind: 'area',
    title: '灵隐龙井片区',
    subtitle: '寺院、山林、茶村',
    summary: '杭州山寺线核心，建议单独留半日，早出发体验更稳。',
    x: 70.3,
    y: 55.7,
    category: 'scenic',
    categoryLabel: '景观',
    tags: ['灵隐', '龙井', '茶文化', '自然'],
    targetType: 'region',
    targetId: 'area-hangzhou-lingyin-longjing',
    regionId: 'area-hangzhou-lingyin-longjing',
    duration: '半天',
    actionHint: '适合和西湖线拆开，避免同一天过度消耗。'
  },
  {
    id: 'area-hangzhou-hubin-wulin',
    kind: 'area',
    title: '湖滨武林片区',
    subtitle: '夜景、餐饮、商圈',
    summary: '第一晚收尾最方便，地铁、餐饮、夜景和住宿选择都集中。',
    x: 74.4,
    y: 53.9,
    category: 'food',
    categoryLabel: '美食',
    tags: ['湖滨', '武林', '夜景', '地铁'],
    targetType: 'region',
    targetId: 'area-hangzhou-hubin-wulin',
    regionId: 'area-hangzhou-hubin-wulin',
    duration: '2-4 小时',
    actionHint: '适合放在晚间，兼顾吃饭、散步和回酒店。'
  },
  {
    id: 'area-hangzhou-shangcheng',
    kind: 'area',
    title: '上城老街片区',
    subtitle: '河坊街、南宋御街',
    summary: '老街、小吃和伴手礼集中，适合和西湖南线或湖滨串联。',
    x: 75.1,
    y: 55.8,
    category: 'landmark',
    categoryLabel: '地标',
    tags: ['老街', '美食', '打卡', '历史文化'],
    targetType: 'region',
    targetId: 'area-hangzhou-shangcheng',
    regionId: 'area-hangzhou-shangcheng',
    duration: '2-3 小时',
    actionHint: '不要把老街当成全天主线，更适合轻量补充。'
  },
  {
    id: 'area-hangzhou-grand-canal',
    kind: 'area',
    title: '大运河片区',
    subtitle: '拱宸桥、小河直街',
    summary: '运河水岸、历史街区和咖啡散步更松弛，适合避开西湖人流。',
    x: 73.4,
    y: 51.6,
    category: 'inspiration',
    categoryLabel: '灵感',
    tags: ['运河', '城市漫步', '低强度', '咖啡'],
    targetType: 'region',
    targetId: 'area-hangzhou-grand-canal',
    regionId: 'area-hangzhou-grand-canal',
    duration: '2-4 小时',
    actionHint: '适合作为第二天下午或雨天替代路线。'
  },
  {
    id: 'area-hangzhou-xixi',
    kind: 'area',
    title: '西溪湿地片区',
    subtitle: '自然湿地、船行体验',
    summary: '自然感更强，建议留出半天，不适合和西湖全天硬塞。',
    x: 68.8,
    y: 53.8,
    category: 'scenic',
    categoryLabel: '景观',
    tags: ['西溪', '自然', '亲子', '慢游'],
    targetType: 'region',
    targetId: 'area-hangzhou-xixi',
    regionId: 'area-hangzhou-xixi',
    duration: '半天',
    actionHint: '天气好时体验明显更好，雨天谨慎安排长距离户外。'
  }
];

export const HANGZHOU_POIS: HomeMapLayerItem[] = [
  poi('poi-hangzhou-westlake', '西湖苏堤', '经典湖景步行线', '清晨或傍晚慢走最稳，适合作为杭州第一段湖线。', 72.7, 54.6, 'landmark', '地标', ['西湖', '城市漫步', '湖景'], 'area-hangzhou-westlake', '120 分钟'),
  poi('poi-hangzhou-broken-bridge', '断桥残雪', '西湖北入口地标', '入门级地标，建议清晨避开旅行团人流。', 73.2, 53.8, 'landmark', '地标', ['西湖', '打卡', '避峰'], 'area-hangzhou-westlake', '45 分钟'),
  poi('poi-hangzhou-leifeng-pagoda', '雷峰塔', '南线观景与落日', '适合看西湖南线和落日，门票点位建议放在下午后段。', 73.1, 55.8, 'landmark', '地标', ['观景', '夜景', '亲子'], 'area-hangzhou-westlake', '90 分钟'),
  poi('poi-hangzhou-quyuan', '曲院风荷', '湖边步道和荷花', '夏季荷花和湖边步道体验好，可与苏堤北段顺路。', 72.1, 54.2, 'scenic', '景观', ['自然', '湖景', '轻松'], 'area-hangzhou-westlake', '75 分钟'),
  poi('poi-hangzhou-zhejiang-museum-gushan', '浙江省博物馆孤山馆区', '雨天室内替代', '雨天和炎热天气的西湖线替代点，适合补充历史文化。', 72.8, 54.1, 'inspiration', '灵感', ['雨天备选', '历史文化', '亲子'], 'area-hangzhou-westlake', '90 分钟'),
  poi('poi-hangzhou-lingyin', '灵隐寺', '杭州山寺线核心', '代表性寺院和山林景点，建议早出发并预留半日。', 70.6, 54.9, 'scenic', '景观', ['灵隐', '历史文化', '自然'], 'area-hangzhou-lingyin-longjing', '150 分钟'),
  poi('poi-hangzhou-feilai-peak', '飞来峰', '石刻和山林景区', '与灵隐寺相邻，适合一并安排，节假日注意入口排队。', 70.4, 54.6, 'scenic', '景观', ['石刻', '自然', '避暑'], 'area-hangzhou-lingyin-longjing', '90 分钟'),
  poi('poi-hangzhou-longjing-village', '龙井村', '茶田和茶歇', '茶田、茶歇和山路慢游片区，晴天体验明显更好。', 69.8, 56.1, 'food', '美食', ['茶文化', '自然', '轻松'], 'area-hangzhou-lingyin-longjing', '120 分钟'),
  poi('poi-hangzhou-jiuxi', '九溪烟树', '溪流林荫慢行', '溪流和林荫步道适合半日慢行，雨后路面注意防滑。', 70.5, 57.1, 'scenic', '景观', ['自然', '避暑', '防滑'], 'area-hangzhou-lingyin-longjing', '120 分钟'),
  poi('poi-hangzhou-hubin', '湖滨夜景', '西湖夜间与商圈', '西湖夜间和商圈衔接方便，适合第一晚收尾。', 74.4, 54.8, 'landmark', '地标', ['夜景', '地铁', '美食'], 'area-hangzhou-hubin-wulin', '90 分钟'),
  poi('poi-hangzhou-wulin-night-market', '武林夜市', '夜间小吃与轻购物', '夜间小吃和轻购物集中，适合晚饭后短暂停留。', 74.3, 53.5, 'food', '美食', ['美食', '夜景', '轻松'], 'area-hangzhou-hubin-wulin', '75 分钟'),
  poi('poi-hangzhou-hefang-street', '河坊街', '老街小吃与伴手礼', '老街、小吃和伴手礼集中，适合和南宋御街组合。', 75.2, 55.7, 'food', '美食', ['老街', '小吃', '打卡'], 'area-hangzhou-shangcheng', '90 分钟'),
  poi('poi-hangzhou-southern-song-street', '南宋御街', '上城老街主轴', '适合晚间散步和轻餐，不建议塞成全天主线。', 75.0, 55.3, 'landmark', '地标', ['历史文化', '城市漫步', '美食'], 'area-hangzhou-shangcheng', '80 分钟'),
  poi('poi-hangzhou-xiaohezhi-street', '小河直街历史文化街区', '运河边老街', '适合咖啡、散步和低强度拍照，游客压力低于西湖核心区。', 73.5, 51.7, 'inspiration', '灵感', ['运河', '咖啡', '城市漫步'], 'area-hangzhou-grand-canal', '90 分钟'),
  poi('poi-hangzhou-gongchen-bridge', '拱宸桥', '京杭大运河地标', '京杭大运河杭州段代表地标，适合傍晚看运河水岸。', 73.5, 51.3, 'landmark', '地标', ['地标', '运河', '夜景'], 'area-hangzhou-grand-canal', '60 分钟'),
  poi('poi-hangzhou-xixi-wetland', '西溪湿地', '自然湿地和船行', '自然湿地和船行体验，适合留出半天，不建议和西湖硬塞同天。', 68.7, 53.8, 'scenic', '景观', ['自然', '亲子', '慢游'], 'area-hangzhou-xixi', '180 分钟'),
  transport('transport-hangzhou-longxiangqiao', '龙翔桥地铁站', '西湖湖滨入口', '到湖滨、西湖东线和商圈都方便，适合作为西湖轻量路线起点。', 74.2, 54.6, ['地铁', '交通', '湖滨']),
  transport('transport-hangzhou-east-railway', '杭州东站', '高铁到达枢纽', '外地到达杭州常用枢纽，进城优先地铁，打车高峰排队明显。', 76.3, 52.5, ['火车站', '交通', '到达']),
  transport('transport-hangzhou-xiaoshan-airport', '萧山机场', '机场到达枢纽', '机场进城建议预留 60-90 分钟，晚到时优先住湖滨或武林附近。', 79.1, 58.6, ['飞机场', '交通', '到达']),
  transport('transport-hangzhou-westlake-bus', '西湖公交换乘', '景区接驳提醒', '西湖核心区节假日少自驾，公交接驳和步行更稳定。', 72.6, 54.9, ['公交站', '交通', '避坑'])
];

export function getSemanticLayer(scale: number): HomeMapLayer {
  if (scale >= HOME_MAP_ZOOM_LEVELS.poiMin) {
    return 'poi';
  }
  if (scale >= HOME_MAP_ZOOM_LEVELS.areaMin) {
    return 'area';
  }
  return 'national';
}

export function getLayerItems(layer: HomeMapLayer, discoveryId: DiscoveryId, keyword = ''): HomeMapLayerItem[] {
  if (layer === 'national') {
    return [];
  }
  const source = layer === 'area' ? HANGZHOU_AREAS : HANGZHOU_POIS;
  return filterLayerItems(source, discoveryId, keyword);
}

export function filterLayerItems(
  items: HomeMapLayerItem[],
  discoveryId: DiscoveryId,
  keyword = ''
): HomeMapLayerItem[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return items.filter((item) => {
    const discoveryMatched =
      discoveryId === 'inspiration' ||
      item.category === discoveryId ||
      item.tags.some((tag) => discoveryTagMatches(tag, discoveryId));

    if (!discoveryMatched) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return searchableText(item).includes(normalizedKeyword);
  });
}

export function findHomeMapItem(keyword: string): HomeMapLayerItem | null {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return null;
  }
  return (
    [HANGZHOU_CITY_MAP_ITEM, ...HANGZHOU_AREAS, ...HANGZHOU_POIS].find((item) =>
      searchableText(item).includes(normalizedKeyword)
    ) || null
  );
}

function poi(
  id: string,
  title: string,
  subtitle: string,
  summary: string,
  x: number,
  y: number,
  category: DiscoveryId,
  categoryLabel: string,
  tags: string[],
  regionId: string,
  duration: string
): HomeMapLayerItem {
  return {
    id,
    kind: 'poi',
    title,
    subtitle,
    summary,
    x,
    y,
    category,
    categoryLabel,
    tags,
    targetType: 'poi',
    targetId: id,
    regionId,
    poiId: id,
    duration,
    actionHint: '可直接加入行程，街道级导航请进入杭州真实地图页。'
  };
}

function transport(
  id: string,
  title: string,
  subtitle: string,
  summary: string,
  x: number,
  y: number,
  tags: string[]
): HomeMapLayerItem {
  return {
    id,
    kind: 'poi',
    title,
    subtitle,
    summary,
    x,
    y,
    category: 'transport',
    categoryLabel: '交通',
    tags,
    targetType: 'transport',
    targetId: id,
    regionId: 'city-hangzhou',
    duration: '按到达方式调整',
    actionHint: '交通点用于辅助规划，不作为景点加入游玩时长。'
  };
}

function discoveryTagMatches(tag: string, discoveryId: DiscoveryId): boolean {
  const tagText = tag.toLowerCase();
  if (discoveryId === 'landmark') {
    return tag.includes('地标') || tag.includes('打卡') || tag.includes('历史');
  }
  if (discoveryId === 'scenic') {
    return tag.includes('景观') || tag.includes('自然') || tag.includes('湖景') || tag.includes('西湖');
  }
  if (discoveryId === 'food') {
    return tag.includes('美食') || tag.includes('小吃') || tag.includes('茶') || tag.includes('咖啡');
  }
  if (discoveryId === 'transport') {
    return tag.includes('交通') || tag.includes('地铁') || tag.includes('公交') || tag.includes('机场') || tag.includes('火车站');
  }
  return tagText.length > 0;
}

function searchableText(item: HomeMapLayerItem): string {
  return [
    item.id,
    item.title,
    item.subtitle,
    item.summary,
    item.category,
    item.categoryLabel,
    item.targetId,
    item.regionId,
    ...item.tags
  ]
    .join(' ')
    .toLowerCase();
}
