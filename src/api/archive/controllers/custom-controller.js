"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

const chainableArrayProps = [
  "t_1s",
  "t_2s",
  "t_3s",
  "t_4s",
  "colors",
  "materials",
  "techniques",
  "details",
];

module.exports = createCoreController("api::archive.archive", ({ strapi }) => ({
  async bulkUpdate(ctx) {
    try {
      const concatData = ctx.request.body.partialArchive;
      const archives = await strapi.entityService.findMany(
        "api::archive.archive",
        {
          filters: { id: { $in: ctx.request.body.ids } },
          populate: chainableArrayProps.reduce((acc, prop) => {
            acc[prop] = true;
            return acc;
          }, {}),
        }
      );

      if (ctx.request.body.concatChanges) {
        for (let archive of archives) {
          chainableArrayProps.forEach((key) => {
            if (Array.isArray(concatData[key]) && concatData[key].length) {
              archive[key] = archive[key] || [];
              archive[key] = [
                ...new Set([...concatData[key], ...archive[key]]).values(),
              ];
            }
          });
          // concat notes
          if (concatData.note) {
            archive.note = archive.note
              ? `${concatData.note} | ${archive.note}`
              : concatData.note;
          }
          //merge all other fields
          for (const key in concatData) {
            if (
              concatData.hasOwnProperty(key) &&
              !chainableArrayProps.includes(key) &&
              key !== "note"
            ) {
              archive[key] = concatData[key];
            }
          }
        }
      } else {
        for (let archive of archives) {
          for (const key in concatData) {
            if (concatData.hasOwnProperty(key)) {
              archive[key] = concatData[key];
            }
          }
        }
      }

      for (let archive of archives) {
        await strapi.entityService.update("api::archive.archive", archive.id, {
          data: { ...archive },
        });
      }

      ctx.body = archives.map((archive) => ({ content: archive }));
    } catch (err) {
      ctx.status = 500;
      ctx.body = err;
    }
  },
}));
