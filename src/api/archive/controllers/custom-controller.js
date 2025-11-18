"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

const chainableStringProps = ["note", "object_description"];
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
// These are the properties that can be -1 and should be set to null
const relationshipProps = [
  "apartment",
  "place",
  "shelf",
  "sector",
  "box",
  "season",
  "fantasy",
  "conservation_status",
];

module.exports = createCoreController("api::archive.archive", ({ strapi }) => ({
  async bulkUpdate(ctx) {
    try {
      const newPartialData = ctx.request.body.partialArchive;
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
            if (
              Array.isArray(newPartialData[key]) &&
              newPartialData[key].length
            ) {
              archive[key] = archive[key] || [];
              archive[key] = [
                ...new Set([...newPartialData[key], ...archive[key]]).values(),
              ];
            }
          });
          chainableStringProps.forEach((key) => {
            if (newPartialData[key]) {
              archive[key] = archive[key]
                ? `${newPartialData[key]} | ${archive[key]}`
                : newPartialData[key];
            }
          });
          //merge all other fields
          for (const key in newPartialData) {
            if (
              newPartialData.hasOwnProperty(key) &&
              !chainableArrayProps.includes(key) &&
              !chainableStringProps.includes(key)
            ) {
              if (relationshipProps.includes(key)) {
                archive[key] =
                  newPartialData[key] === -1 ? null : newPartialData[key];
              } else {
                archive[key] = newPartialData[key];
              }
            }
          }
        }
      } else {
        for (let archive of archives) {
          for (const key in newPartialData) {
            if (newPartialData.hasOwnProperty(key)) {
              if (relationshipProps.includes(key)) {
                archive[key] =
                  newPartialData[key] === -1 ? null : newPartialData[key];
              } else {
                archive[key] = newPartialData[key];
              }
            }
          }
        }
      }

      const newArchives = [];
      for (let archive of archives) {
        newArchives.push(
          await strapi.entityService.update(
            "api::archive.archive",
            archive.id,
            {
              data: { ...archive },
              populate: [...relationshipProps, ...chainableArrayProps].reduce(
                (acc, prop) => {
                  acc[prop] = true;
                  return acc;
                },
                {}
              ),
            }
          )
        );
      }

      ctx.body = { content: newArchives };
    } catch (err) {
      ctx.status = 500;
      ctx.body = err;
    }
  },
}));
