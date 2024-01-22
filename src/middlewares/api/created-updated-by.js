module.exports = {
  updatedByUser: async (next, parent, args, context, info) => {
    args.data.updated_by_user = context.state.user;
    return next(parent, args, context, info);
  },
  createdByUser: async (next, parent, args, context, info) => {
    args.data.created_by_user = context.state.user;
    args.data.updated_by_user = context.state.user;
    return next(parent, args, context, info);
  },
};
