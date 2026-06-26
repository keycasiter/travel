Page({
  data: {
    shareCode: ''
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ shareCode: query.shareCode || '' });
  }
});
