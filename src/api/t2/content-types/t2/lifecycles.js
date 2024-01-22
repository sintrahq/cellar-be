module.exports = {
  async beforeDelete(event) {
    await strapi.service("api::utils.utils").deleteChildren(event, "t2");
  },
  async beforeDeleteMany(event) {
    await strapi.service("api::utils.utils").deleteChildren(event, "t2");
  },
};
