const {
  updatedByUser,
  createdByUser,
} = require("../../../../middlewares/api/created-updated-by");

module.exports = {
  extendFolderResolversConfig: {
    "Mutation.updateFolder": {
      middlewares: [updatedByUser],
    },
    "Mutation.createFolder": {
      middlewares: [createdByUser],
    },
  },
};
