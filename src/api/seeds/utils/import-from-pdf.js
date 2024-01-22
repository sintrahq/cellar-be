const sql = require("mssql");
const fetch = require("node-fetch");
const FormData = require("form-data");
const mime = require("mime-types");
const fs = require("fs");

const importArchivesFromPdf = (ctx) => {
  try {
    fs.readFile(process.env.JSON_LOCAL_FOLDER, async (err, data) => {
      if (err) {
        console.log("READ FILE ERR: ", err);
      } else {
        console.log("START IMPORT ---");
        let items = JSON.parse(data);

        const entries = await strapi.entityService.findMany(
          "api::archive.archive",
          {}
        );
        items = items.filter((item) => {
          return !entries.find((entry) => entry.description === item.text);
        });

        const limit = 100;

        for (let i = 0; i < items.length; i = i + limit) {
          await Promise.all(
            items.slice(i, i + limit).map((item) => {
              return new Promise(async (resolve, reject) => {
                try {
                  // console.log("importing archives", i, i + limit);
                  const image = await imageImportFromFS(item.image);
                  await strapi.service("api::archive.archive").create({
                    data: {
                      is_imported: false,
                      t_1s: [1, 7],
                      description: item.text,
                      images: [image.id],
                    },
                  });

                  return resolve();
                } catch (error) {
                  return reject(error);
                }
              });
            })
          );
        }
        console.log("--- END IMPORT");
      }
    });
  } catch (e) {
    console.log("Error: ", e);
  }

  // for (let i = 0; i < archives.recordset.length; i = i + limit) {
  //   console.log("importing archives", i, i + limit);

  // }
  return { data: "OK" };
};

const imageImportFromFS = async (imageName) => {
  const filename = `${imageName}`;
  let data;
  try {
    data = fs.readFileSync(`${process.env.IMAGES_LOCAL_FOLDER}/${filename}`);
  } catch (e) {
    console.error("Missing file: ", filename);
    return;
  }
  return await uploadFile(data, filename);
};

const uploadFile = async (fileContent, filename) => {
  const formData = new FormData();
  formData.append("files", fileContent, {
    filename: filename,
    contentType: mime.lookup(filename),
  });

  let uploadRes;
  try {
    uploadRes = await fetch(`${process.env.URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    console.error(e);
  }

  return (await uploadRes?.json())[0];
};

module.exports = {
  importFromPdf: importArchivesFromPdf,
};
