"use strict";

const {
  extendArchiveLoanResolversConfig,
} = require("./api/archive-loan/content-types/archive-loan/graphql-extension");
const {
  extendArchiveType,
  extendArchiveResolversConfig,
} = require("./api/archive/content-types/archive/graphql-extension");
const {
  extendFolderResolversConfig,
} = require("./api/folder/content-types/folder/graphql-extension");
const {
  extendLoanResolversConfig,
} = require("./api/loan/content-types/loan/graphql-extension");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const extensionService = strapi.plugin("graphql").service("extension");

    extensionService.use(({ nexus }) => {
      return {
        types: [...extendArchiveType(nexus)],
        resolversConfig: {
          ...extendArchiveResolversConfig,
          ...extendFolderResolversConfig,
          ...extendLoanResolversConfig,
          ...extendArchiveLoanResolversConfig,
        },
      };
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
