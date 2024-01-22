module.exports = {
  routes: [
    {
      method: "GET",
      path: "/filters",
      handler: "filters.getAllFilters",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
