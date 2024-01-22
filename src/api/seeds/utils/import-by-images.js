const sql = require("mssql");
const fetch = require("node-fetch");
const FormData = require("form-data");
const mime = require("mime-types");
const fs = require("fs");

const importArchivesFromImages = (ctx) => {
  try {
    fs.readFile(process.env.JSON_LOCAL_FOLDER, async (err, data) => {
      if (err) {
        console.log("READ FILE ERR: ", err);
      } else {
        // All JSON DATA
        let items = JSON.parse(data);

        fs.readdir(`${process.env.IMAGES_LOCAL_FOLDER}`, async (err, files) => {
          if (err) {
            console.log(err);
          }
          // files.map((file) => {
          //   const archiveToImport = items.find((item) => item.image === file);
          //   console.log(archiveToImport);
          // });

          /**
           * RESET
           * archives
           * archives ts1_links
           * file_
           * file_folders
           * file_related
           * t1s -> 0
           */

          // 786
          const entries = await strapi.entityService.findMany(
            "api::archive.archive",
            {}
          );

          const itemsToUpload = files
            .map((fileName) => {
              const item = items.find((item) => item.image === fileName);
              if (item) {
                // console.log(
                //   "item: ",
                //   `IMG:${fileName} -> ${item.image}`,
                //   `TEXT:${item.text}`,
                //   `NOTE:${
                //     entries.find((entry) => entry.note === item.text)?.note
                //   }`
                // );
                if (!entries.find((entry) => entry.note === item.text)) {
                  return item;
                }
              }
              return;
            })
            .filter((val) => !!val);
          console.log("itemsToUpload.length: ", itemsToUpload.length);

          // http://localhost:1337/api/seeds/import-by-images
          const limit = 50;
          for (let i = 0; i < itemsToUpload.length; i = i + limit) {
            console.log("AWAIT START IMPORT ---");
            await Promise.all(
              itemsToUpload.slice(i, i + limit).map((item) => {
                return new Promise(async (resolve, reject) => {
                  try {
                    // console.log("importing archives", i, i + limit);
                    const image = await imageImportFromFS(item.image);
                    // const archiveToImport = items.find(
                    //   (item) => item.image === fileName
                    // );

                    const archiveData = {
                      is_imported: false,
                      t_1s: [1],
                      // TODO CHANGE THIS
                      t_2s: [1],
                      note: item.text,
                      images: [image.id],
                    };

                    await strapi.service("api::archive.archive").create({
                      data: archiveData,
                    });

                    console.log("RESOLVE: ", archiveData);
                    return resolve();
                  } catch (error) {
                    console.log(error);
                    return reject(error);
                  }
                });
              })
            );
            console.log("END IMPORT ---");
          }
        });
      }
    });
  } catch (e) {
    console.log("Error: ", e);
  }
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
  importByImages: importArchivesFromImages,
};
