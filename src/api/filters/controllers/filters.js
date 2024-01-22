"use strict";

/**
 * A set of functions called "actions" for `filters`
 */

module.exports = {
  getAllFilters: async (ctx, next) => {
    try {
      const colors = await strapi.controller("api::color.color").find(ctx);
      ctx.body = { lol: colors };
    } catch (err) {
      ctx.body = err;
    }
  },
};
