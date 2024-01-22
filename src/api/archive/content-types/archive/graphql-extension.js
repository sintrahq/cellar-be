const {
  updatedByUser,
  createdByUser,
} = require("../../../../middlewares/api/created-updated-by");

module.exports = {
  extendArchiveType: (nexus) => {
    const { getContentTypeArgs, transformArgs } = strapi
      .plugin("graphql")
      .service("builders").utils;

    return [
      nexus.extendType({
        type: "Query",
        definition(t) {
          t.field("totalArchivesValue", {
            type: "Int",
            args: getContentTypeArgs(
              strapi.contentTypes["api::archive.archive"]
            ),
            resolve: async (root, args, ctx) => {
              const transformedArgs = transformArgs(args, {
                contentType: strapi.contentTypes["api::archive.archive"],
                usePagination: false,
              });

              const response = await strapi.entityService.findMany(
                "api::archive.archive",
                {
                  fields: ["value", "quantity"],
                  filters: transformedArgs.filters,
                }
              );

              return response
                .map((a) => (a.quantity ? a.value * a.quantity : a.value))
                .reduce((a, c) => a + c, 0);
            },
          });
          t.field("totalArchivesQuantity", {
            type: "Int",
            args: getContentTypeArgs(
              strapi.contentTypes["api::archive.archive"]
            ),
            resolve: async (root, args, ctx) => {
              const transformedArgs = transformArgs(args, {
                contentType: strapi.contentTypes["api::archive.archive"],
                usePagination: false,
              });

              const response = await strapi.entityService.findMany(
                "api::archive.archive",
                {
                  fields: ["quantity"],
                  filters: transformedArgs.filters,
                }
              );

              return response.map((a) => a.quantity).reduce((a, c) => a + c, 0);
            },
          });
          t.list.field("neighbours", {
            type: "ArchiveEntity",
            args: getContentTypeArgs(
              strapi.contentTypes["api::archive.archive"]
            ),
            resolve: async (root, args, ctx) => {
              const transformedArgs = transformArgs(args, {
                contentType: strapi.contentTypes["api::archive.archive"],
                usePagination: false,
              });

              const searchFilter = transformedArgs.filters["$and"].splice(0, 1);
              const searchInput = JSON.stringify(searchFilter)
                .split('"$eq":"')[1]
                .split('"')[0];

              const archives = await strapi.entityService.findMany(
                "api::archive.archive",
                {
                  fields: ["id"],
                  filters: transformedArgs.filters,
                  sort: transformedArgs.sort,
                }
              );

              const index = archives.findIndex(
                (archive) => archive.id.toString() === searchInput
              );

              if (index > -1) {
                const neighbourIds = archives
                  .slice(
                    Math.max(0, index - 4),
                    Math.min(index + 5, archives.length)
                  )
                  .map((a) => a.id);

                const neighbours = await strapi.entityService.findMany(
                  "api::archive.archive",
                  {
                    populate: ["images"],
                    filters: {
                      id: neighbourIds,
                    },
                    sort: transformedArgs.sort,
                  }
                );

                return neighbours;
              } else {
                return [];
              }
            },
          });
        },
      }),
    ];
  },
  extendArchiveResolversConfig: {
    "Query.totalArchivesValue": {
      auth: {
        scope: ["api::archive.archive.find"],
      },
    },
    "Query.totalArchivesQuantity": {
      auth: {
        scope: ["api::archive.archive.find"],
      },
    },
    "Query.neighbours": {
      auth: {
        scope: ["api::archive.archive.find"],
      },
    },
    "Mutation.updateArchive": {
      middlewares: [updatedByUser],
    },
    "Mutation.createArchive": {
      middlewares: [createdByUser],
    },
  },
};
