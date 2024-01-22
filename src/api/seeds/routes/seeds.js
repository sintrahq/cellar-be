module.exports = {
  routes: [
    {
      method: "GET",
      path: "/seeds/archives",
      handler: "seeds.generateArchiveSeeds",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/seeds/import",
      handler: "seeds.dbImport",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/seeds/import-from-pdf",
      handler: "seeds.importFromPdf",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/seeds/import-by-images",
      handler: "seeds.importByImages",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
