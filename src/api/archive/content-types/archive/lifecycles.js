module.exports = {
  async beforeCreate(event) {
    const { params } = event;
    if (!params.data.is_imported) {
      const t1 = await loadTypology("t1", params.data.t_1s);

      // NOTE: Increment the t1 and save it
      t1.inventory_counter++;
      await strapi.db.query(`api::t1.t1`).update({
        where: {
          id: t1.id,
        },
        data: t1,
      });
      const counter = String(t1.inventory_counter).padStart(6, "0");
      event.params.data.inventory = `${t1.code}${counter}`;

      await doBeforeCreateAndUpdate(event);
    }
  },

  async beforeUpdate(event) {
    await doBeforeCreateAndUpdate(event);
  },

  async beforeDelete(event) {
    await deleteImages(event);
  },
  async beforeDeleteMany(event) {
    await deleteImages(event);
  },
};

async function deleteImages(event) {
  const archivesWithImages = await loadAllImages(event);

  await Promise.all(
    archivesWithImages.map((archiveWithImages) => {
      // NOTE: Delete images if present
      if (archiveWithImages.images && archiveWithImages.images.length) {
        return strapi
          .service("api::utils.utils")
          .deleteUploads(archiveWithImages.images);
      }

      return Promise.resolve();
    })
  );
}

async function loadAllImages(event) {
  const { where } = event.params;
  return strapi.entityService.findMany(`api::archive.archive`, {
    filters: where,
    fields: ["id"],
    populate: {
      images: {
        fields: ["id"],
      },
    },
  });
}

async function doBeforeCreateAndUpdate(event) {
  const { params } = event;
  const { data } = params;

  let archive = {};
  if (params.where && params.where.id) {
    archive = await strapi.entityService.findOne(
      "api::archive.archive",
      params.where.id,
      {
        populate: {
          brand: true,
          season: true,
          t_1s: true,
          t_2s: true,
        },
      }
    );
  }

  Object.assign(archive, data);

  let brand;
  if (archive.brand) {
    brand = await strapi.entityService.findOne(
      "api::brand.brand",
      (archive.brand && archive.brand.id) || archive.brand
    );
  }
  let season;
  if (archive.season) {
    season = await strapi.entityService.findOne(
      "api::season.season",
      (archive.season.id && archive.season.id) || archive.season
    );
  }

  const t1 = await loadTypology("t1", archive.t_1s);
  const t2 = await loadTypology("t2", archive.t_2s);

  const typology = t2 ? t2 : t1;

  data.description = getDescription({
    year: archive.year,
    brand,
    season,
    typology,
  });

  // event.params.data.label = getLabel({ ...params.data, t1, t2, t3, t4 });
}

async function loadTypology(name, value) {
  value = value.map((t) => t.id || t);

  if (value && value.length > 0) {
    return strapi.db.query(`api::${name}.${name}`).findOne({
      where: {
        id: value[0],
      },
    });
  }
  return Promise.resolve(undefined);
}

function getDescription({ year, brand, season, typology }) {
  return (
    (brand ? brand.name + ", " : "") +
    (typology ? typology.name + ", " : "") +
    (year ? year + ", " : "") +
    (season ? season.name + ", " : "")
  ).slice(0, -2);
}

// function getLabel(archive) {
//   const dataLabel = (
//     (archive.t1 ? archive.t1.name + "|" : "") +
//     (archive.brand ? archive.brand + "|" : "") +
//     (archive.t2 ? archive.t2.name + "|" : "") +
//     (archive.t3 ? archive.t3.name + "|" : "") +
//     (archive.t4 ? archive.t4.name + "|" : "") +
//     (archive.year ? archive.year + " " : "") +
//     (archive.season ? archive.season + " " : "")
//   ).slice(0, -1);

//   const locationLabel = (
//     (archive.apartment ? archive.apartment + " " : "") +
//     (archive.place ? archive.place + " " : "") +
//     (archive.shelf ? archive.shelf + " " : "") +
//     (archive.sector ? archive.sector + " " : "") +
//     (archive.box ? archive.box + " " : "")
//   ).slice(0, -1);

//   return dataLabel + (locationLabel ? "$" + locationLabel : "");
// }
