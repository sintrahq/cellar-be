module.exports = {
  async beforeDelete(event) {
    await cleanUp(event);
  },
  async beforeDeleteMany(event) {
    await cleanUp(event);
  },
};

async function cleanUp(event) {
  const { where } = event.params;

  const loans = await strapi.query("api::loan.loan").findMany({
    where,
    populate: {
      archive_loans: {
        select: ["id"],
      },
    },
  });

  await Promise.all(
    loans.map((loan) => {
      return Promise.all([
        loan.archive_loans.length &&
          strapi.db.query("api::archive-loan.archive-loan").deleteMany({
            where: {
              $or: loan.archive_loans,
            },
          }),
      ]);
    })
  );
}
