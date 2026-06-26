interface GlobalData {
  userId: number | null;
}

App<{ globalData: GlobalData }>({
  globalData: {
    userId: null
  }
});
