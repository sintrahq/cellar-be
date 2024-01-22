const {
  updatedByUser,
  createdByUser,
} = require("../../../../middlewares/api/created-updated-by");

module.exports = {
  extendLoanResolversConfig: {
    "Mutation.updateLoan": {
      middlewares: [updatedByUser],
    },
    "Mutation.createLoan": {
      middlewares: [createdByUser],
    },
  },
};
