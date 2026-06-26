Page({
  data: {
    title: '水墨中国探索地图',
    subtitle: '缩放、平移并探索城市、片区、景点和精选攻略。'
  },

  goPlan() {
    wx.switchTab({ url: '/pages/itinerary/index' });
  }
});
