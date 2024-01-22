"use strict";

/**
 * A set of functions called "actions" for `seeds`
 */

const { faker } = require("@faker-js/faker");
const dbImport = require("../utils/db-import");
const fileImport = require("../utils/import-from-pdf");
const imagesImport = require("../utils/import-by-images");

module.exports = {
  generateArchiveSeeds: async (ctx, next) => {
    try {
      for (let index = 0; index < 5000; index++) {
        await strapi.service("api::archive.archive").create({
          data: {
            description: faker.commerce.productName(),
            is_mock: true,
          },
        });
      }

      ctx.body = "ok";
    } catch (err) {
      ctx.body = err;
    }
  },
  dbImport: dbImport.import,
  importFromPdf: fileImport.importFromPdf,
  importByImages: imagesImport.importByImages,
};
