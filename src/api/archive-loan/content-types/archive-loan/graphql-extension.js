const {
  updatedByUser,
  createdByUser,
} = require("../../../../middlewares/api/created-updated-by");

module.exports = {
  extendArchiveLoanResolversConfig: {
    "Mutation.updateArchiveLoan": {
      middlewares: [updatedByUser],
    },
    "Mutation.createArchiveLoan": {
      middlewares: [createdByUser],
    },
  },
};
