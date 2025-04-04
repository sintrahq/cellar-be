module.exports = {
  async beforeCreate(event) {
    const { params } = event;
    if (!params.data.is_imported) {
      const t1 = await loadTypology("t1", params.data.t_1s);

      // NOTE: Increment the t1 and save it
      if (!event.params.data.inventory) {
        t1.inventory_counter++;
        await strapi.db.query(`api::t1.t1`).update({
          where: {
            id: t1.id,
          },
          data: t1,
        });
        const counter = String(t1.inventory_counter).padStart(6, "0");
        event.params.data.inventory = `${t1.code}${counter}`;
      }

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
          producer: true,
          distributor: true,
          race: true,
          t_1s: true,
          t_2s: true,
          t_3s: true,
          t_4s: true,
        },
      }
    );
  }

  if (archive.market_estimate !== data.market_estimate) {
    if (data.market_estimate) {
      data.market_estimate_date = new Date();
    } else {
      data.market_estimate_date = null;
    }
  }

  Object.assign(archive, data);

  let producer;
  if (archive.producer) {
    producer = await strapi.entityService.findOne(
      "api::producer.producer",
      (archive.producer && archive.producer.id) || archive.producer
    );
  }
  let distributor;
  if (archive.distributor) {
    distributor = await strapi.entityService.findOne(
      "api::distributor.distributor",
      (archive.distributor.id && archive.distributor.id) || archive.distributor
    );
  }
  let race;
  if (archive.race) {
    race = await strapi.entityService.findOne(
      "api::race.race",
      (archive.race.id && archive.race.id) || archive.race
    );
  }

  const t1 = await loadTypology("t1", archive.t_1s);
  const t2 = await loadTypology("t2", archive.t_2s);
  const t3 = await loadTypology("t3", archive.t_3s);
  const t4 = await loadTypology("t4", archive.t_4s);

  const typology = t4 || t3 || t2 || t1;

  data.description = getDescription({
    producer,
    distributor,
    typology,
    race,
    weight: archive.weight,
  });

  // event.params.data.label = getLabel({ ...params.data, t1, t2, t3, t4 });
}

async function loadTypology(name, value) {
  if (value.connect) value = value.connect;
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

function getDescription({ producer, distributor, typology, race, weight }) {
  return (
    (producer ? producer.name + ", " : "") +
    (distributor ? distributor.name + ", " : "") +
    (typology ? typology.name + ", " : "") +
    (race ? race.name + ", " : "") +
    (weight ? (weight / 1000).toFixed(1) + " Kg, " : "")
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
