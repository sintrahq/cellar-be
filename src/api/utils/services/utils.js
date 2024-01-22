"use strict";

/**
 * utils service.
 */

module.exports = () => ({
  deleteChildren: async (
    event,
    parentModel,
    childrenModel,
    childrenRelationModel
  ) => {
    const { where } = event.params;
    // NOTE: Fetch parent with all children
    const parentsWithChildren = await strapi
      .query(`api::${parentModel}.${parentModel}`)
      .findMany({
        where,
        populate: {
          [childrenRelationModel]: {
            select: ["id"],
          },
        },
      });

    await Promise.all(
      parentsWithChildren.map((parentWithChild) => {
        // NOTE: Delete all children if present
        if (parentWithChild[childrenRelationModel].length) {
          return strapi.db
            .query(`api::${childrenModel}.${childrenModel}`)
            .deleteMany({
              where: {
                $or: parentWithChild[childrenRelationModel],
              },
            });
        }

        return Promise.resolve();
      })
    );
  },

  deleteUploads: async (items) => {
    if (items.length) {
      return strapi
        .service("plugin::upload.file")
        .deleteByIds(items.map((item) => item.id));
    }
    return Promise.resolve();
  },
});
