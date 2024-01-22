module.exports = {
  async beforeDelete(event) {
    await strapi
      .service("api::utils.utils")
      .deleteChildren(event, "t1", "t2", "t_2s");
  },
  async beforeDeleteMany(event) {
    await strapi
      .service("api::utils.utils")
      .deleteChildren(event, "t1", "t2", "t_2s");
  },
};
