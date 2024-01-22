const sql = require("mssql");
const Dropbox = require("dropbox");
const fetch = require("node-fetch");
const FormData = require("form-data");
const mime = require("mime-types");
const fs = require("fs");

let blob = {};

const importMain = async (ctx, next) => {
  const startTime = Date.now();
  startImportLog("");
  const clean = ctx.query.clean === "true";

  if (clean) {
    console.log("ATTENTION: DB CLEAN");
  }
  try {
    await dbConnection();
    await init(clean);

    await typologiesImport();
    await colorsImport();
    await materialsImport();
    await techniquesImport();
    await foldersImport();
    await imageFoldersImport();
    await miscImport();
    await archivesImport();

    await suitTypologiesImport();
    await linksImport();
    await suitsImport();
    await loansImport();
  } catch (e) {
    console.error(e);
  }
  const endTime = Date.now();
  endImportLog("");
  console.log(`import time: ${Math.round(endTime - startTime) / 1000}s`);
  ctx.body = "Done";
};

const imageImportFromDropbox = async (imageName) => {
  var dbx = new Dropbox.Dropbox({
    accessToken: process.env.DBOX_ACCESS_TOKEN,
    pathRoot: JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: "9939926288",
    }),
  });

  const searchRes = await dbx.filesSearchV2({ query: `${imageName}N` });
  const dbxFileMetadata = searchRes.result.matches[0]?.metadata?.metadata;
  if (dbxFileMetadata) {
    let downloadFileResponse;
    try {
      downloadFileResponse = await fetch(
        "https://content.dropboxapi.com/2/files/download",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.DBOX_ACCESS_TOKEN}`,
            "Dropbox-API-Path-Root": JSON.stringify({
              ".tag": "namespace_id",
              namespace_id: "9939926288",
            }),
            "Dropbox-API-Arg": JSON.stringify({
              path: dbxFileMetadata.path_lower,
            }),
          },
        }
      );
    } catch (e) {
      console.log(e);
    }

    const fileContent = await downloadFileResponse.buffer();
    const fileContentMetadata = JSON.parse(
      downloadFileResponse.headers.get("Dropbox-Api-Result")
    );

    return await uploadFile(fileContent, fileContentMetadata.name);
  } else {
    console.warn("Missing file", imageName);
  }
};

const imageImportFromFS = async (imageName, folder) => {
  const filename = `${imageName}N.jpg`;
  let data;
  try {
    data = fs.readFileSync(
      `${process.env.IMAGES_LOCAL_FOLDER}/${folder}/${filename}`
    );
  } catch (e) {
    console.error("Missing file", folder, filename);
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

const typologiesImport = async () => {
  startImportLog("typologies");
  const rootTypologies = await sql.query(`
    SELECT *
    FROM guardaroba.dbo.tblTipologiaCode;
  `);
  for (let i = 0; i < rootTypologies.recordset.length; i++) {
    const typology = rootTypologies.recordset[i];

    const typologies = await sql.query(`
      SELECT TermineID, TermineParentID, Livello, Termine, Sezione, Ordine
      FROM guardaroba.dbo.tblValoriTree
      WHERE Sezione = '${typology.codeClasse}' AND Termine != 'Completo'
    `);
    console.log(`${typology.tipologia} found: ${typologies.recordset.length}`);

    const secondLevel = typologies.recordset.filter((t) => t.Livello === 0);

    blob.t2 = blob.t2.concat(
      await Promise.all(
        secondLevel.map((t) => {
          return new Promise(async (resolve) => {
            let res;
            res = await strapi.db.query("api::t2.t2").findOne({
              where: { name: t.Termine },
            });

            if (!res) {
              res = await strapi.service("api::t2.t2").create({
                data: {
                  name: t.Termine,
                },
                populate: "*",
              });
            }

            resolve({
              ...res,
              ...t,
            });
          });
        })
      )
    );

    const counter = await sql.query(`
        SELECT MAX(ProgressivoTipologia) as counter
        FROM guardaroba.dbo.tblDatiGenerali
        WHERE Tipologia = '${typology.tipologia}'
      `);

    let tRes;
    tRes = await strapi.db.query("api::t1.t1").findOne({
      where: { name: typology.tipologia, code: typology.codeTipo },
    });

    if (!tRes) {
      tRes = await strapi.service("api::t1.t1").create({
        data: {
          name: typology.tipologia,
          code: typology.codeTipo,
          inventory_counter: counter.recordset[0].counter,
          t_2s: blob.t2
            .filter((t2) => t2.Sezione === typology.codeClasse)
            .map((t2) => t2.id),
        },
      });
    }

    blob.t1.push({
      ...tRes,
      ...typology,
    });
  }

  // add parent
  blob.t2 = blob.t2.map((t2) => ({
    ...t2,
    parent: blob.t1.filter((t1) => t1.codeClasse === t2.Sezione)[0],
  }));
  blob.t3 = blob.t3.map((t3) => ({
    ...t3,
    parent: blob.t2.filter((t2) => t2.TermineID === t3.TermineParentID)[0],
  }));
  blob.t4 = blob.t4.map((t4) => ({
    ...t4,
    parent: blob.t3.filter((t3) => t3.TermineID === t4.TermineParentID)[0],
  }));

  endImportLog("typologies");
};

const suitTypologiesImport = async () => {
  startImportLog("suitTypologies");
  const suitTypology = await sql.query(`
      SELECT TermineID, TermineParentID, Livello, Termine, Sezione, Ordine
      FROM guardaroba.dbo.tblValoriTree
      WHERE Termine = 'Completo'
    `);

  const suitTypologies = await sql.query(`
    SELECT TermineID, TermineParentID, Livello, Termine, Sezione, Ordine
    FROM guardaroba.dbo.tblValoriTree
    WHERE TermineParentID = ${suitTypology.recordset[0].TermineID}
  `);

  blob.st1 = await Promise.all(
    suitTypologies.recordset.map((st) => {
      return new Promise((resolve) => {
        strapi
          .service("api::st1.st1")
          .create({
            data: { name: st.Termine },
            populate: "*",
          })
          .then((res) => {
            resolve({
              ...res,
              ...st,
            });
          });
      });
    })
  );

  endImportLog("suitTypologies");
};

const linksImport = async () => {
  startImportLog("links");
  const dbLinks = await sql.query(`
    SELECT *
    FROM guardaroba.dbo.tblLinks
    WHERE tipolink = 'CON' OR tipolink = 'GEN'
  `);
  console.log("found:", dbLinks.recordset.length);

  blob.links = await Promise.all(
    dbLinks.recordset.map((l) => {
      return new Promise((resolve) => {
        const srcArchive = blob.archives[l.inventario1];
        const dstArchive = blob.archives[l.inventario2];
        const isLookbookLink =
          !l.inventario1.startsWith("LBK") && l.inventario2.startsWith("LBK");

        if (srcArchive && dstArchive) {
          strapi
            .service("api::archive.archive")
            .update(srcArchive.id, {
              data: {
                ...srcArchive,
                ...(!isLookbookLink && { links_to: [dstArchive.id] }),
                ...(isLookbookLink && { lookbook_to: [dstArchive.id] }),
              },
            })
            .then((res) => {
              resolve({
                ...res,
                ...l,
              });
            });
        } else {
          resolve();
        }
      });
    })
  );

  endImportLog("links");
};

const formatDate = (date) => {
  if (date) {
    var d = new Date(date),
      month = "" + (d.getMonth() + 1),
      day = "" + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
  }
};

const loansImport = async () => {
  startImportLog("loans");
  const loans = await sql.query(`
    SELECT *
    FROM dbo.tblPrestiti
  `);

  blob.loans = await Promise.all(
    loans.recordset.map((l) => {
      return new Promise((resolve) => {
        strapi
          .service("api::loan.loan")
          .create({
            data: {
              createdAt: new Date(l.pDataOut),
              name: l.pOggetto,
              date_in: formatDate(l.pDataInSt),
              date_out: formatDate(l.pDataOut),
              note: l.pNote,
              reference: l.pDestinatario,
              identifier: `${l.key_pres}`,
            },
          })
          .then((res) => {
            resolve({
              ...res,
              ...l,
            });
          });
      });
    })
  );

  const loansDetails = await sql.query(
    `SELECT * FROM guardaroba.dbo.tblPrestitiDett`
  );

  blob.loanArchives = await Promise.all(
    loansDetails.recordset.map((l) => {
      return new Promise((resolve) => {
        strapi
          .service("api::archive-loan.archive-loan")
          .create({
            data: {
              note_in: l.noteRientro,
              note_out: l.noteStato,
              date_in: formatDate(l.pDataInEff),
              date_out: formatDate(l.pDataOut),
              loan: blob.loans.find((bl) => bl.key_pres === l.key_pres)?.id,
              archive: blob.archives[l.inventario]?.id,
            },
          })
          .then((res) => {
            resolve({
              ...res,
              ...l,
            });
          });
      });
    })
  );

  endImportLog("loans");
};

const suitsImport = async () => {
  startImportLog("suits");
  const dbSuits = await sql.query(`
    SELECT *
    FROM guardaroba.dbo.tblLinks
    WHERE tipolink = 'CPT'
  `);

  const suits = [];

  // create suits group
  dbSuits.recordset.forEach((dbSuit) => {
    const inventario1Index = suits.findIndex((s) =>
      s.archives.includes(dbSuit.inventario1)
    );
    const inventario2Index = suits.findIndex((s) =>
      s.archives.includes(dbSuit.inventario2)
    );

    if (inventario1Index === -1 && inventario2Index === -1) {
      suits.push({
        name: "imported suit",
        archives: [dbSuit.inventario1, dbSuit.inventario2],
      });
    } else if (inventario1Index !== -1 && inventario2Index === -1) {
      suits[inventario1Index].archives.push(dbSuit.inventario2);
    } else if (inventario1Index === -1 && inventario2Index !== -1) {
      suits[inventario2Index].archives.push(dbSuit.inventario1);
    } else if (inventario1Index !== inventario2Index) {
      console.log(
        "Both archives are already in different suits",
        dbSuit.inventario1,
        dbSuit.inventario2
      );
    }
  });

  blob.suits = await Promise.all(
    suits.map((s) => {
      return new Promise((resolve) => {
        const mappedArchives = s.archives
          .map((a) => {
            return blob.archives[a] ?? null;
          })
          .filter((a) => !!a);

        let st1;
        if (mappedArchives.length) {
          // find the proper suit category
          mappedArchives.forEach((a) => {
            const typologies = a.ModelloTipologia.split(";").map((t) => +t);
            st1 = blob.st1.filter((st) => typologies.includes(st.TermineID))[0];
          });

          strapi
            .service("api::suit.suit")
            .create({
              data: {
                name: "importedSuit",
                archives: mappedArchives.map((a) => a.id),
                s_t_1: st1?.id,
              },
              populate: "*",
            })
            .then((res) => {
              resolve({
                ...res,
                ...s,
              });
            });
        } else {
          resolve();
        }
      });
    })
  );

  endImportLog("suits");
};

const colorsImport = async () => {
  startImportLog("colors");
  const colors = await sql.query`
    SELECT key_lval, valore, sezione, ordine, datains
    FROM guardaroba.dbo.tblValori
    WHERE sezione = 'COLORI'
  `;
  console.log(`found: ${colors.recordset.length}`);

  blob.colors = await Promise.all(
    colors.recordset.map((c) => {
      return new Promise(async (resolve) => {
        let res;
        res = await strapi.db.query("api::color.color").findOne({
          where: { name: c.valore },
        });

        if (!res) {
          res = await strapi.service("api::color.color").create({
            data: {
              name: c.valore,
            },
          });
        }

        resolve({
          ...res,
          ...c,
        });
      });
    })
  );

  endImportLog("colors");
};

const techniquesImport = async () => {
  startImportLog("techniques");
  const techniques = await sql.query`
    SELECT key_lval, valore, sezione, ordine, datains
    FROM guardaroba.dbo.tblValori
    WHERE sezione = 'TECNIC'
  `;

  blob.techniques = await Promise.all(
    techniques.recordset.map((t) => {
      return new Promise(async (resolve) => {
        let res;
        res = await strapi.db.query("api::technique.technique").findOne({
          where: { name: t.valore },
        });

        if (!res) {
          res = await strapi.service("api::technique.technique").create({
            data: {
              name: t.valore,
            },
          });
        }

        resolve({
          ...res,
          ...t,
        });
      });
    })
  );

  endImportLog("techniques");
};

const materialsImport = async () => {
  startImportLog("materials");
  const materials = await sql.query`
    SELECT TermineID, TermineParentID, Livello, Termine, Sezione, Ordine
    FROM guardaroba.dbo.tblValoriTree
    WHERE Sezione = 'MATERI';
  `;
  console.log(`found: ${materials.recordset.length}`);

  blob.materials = await Promise.all(
    materials.recordset.map((m) => {
      return new Promise(async (resolve) => {
        let res;
        res = await strapi.db.query("api::material.material").findOne({
          where: { name: m.Termine },
        });

        if (!res) {
          res = await strapi.service("api::material.material").create({
            data: {
              name: m.Termine,
            },
          });
        }

        resolve({
          ...res,
          ...m,
        });
      });
    })
  );

  console.log(`imported: ${blob.materials.length}`);
  endImportLog("materials");
};

const foldersImport = async () => {
  startImportLog("folders");
  const folders = await sql.query(`
    SELECT ci.key_cart, STRING_AGG(CONVERT(NVARCHAR(max),ci.inventario) , ',') AS inventario 
    FROM guardaroba.dbo.tblCartelleImmagini ci
    RIGHT JOIN guardaroba.dbo.tblCartelle c  on c.key_cart  = ci.key_cart
    WHERE ci.key_cart IS NOT NULL
    GROUP by ci.key_cart
  `);

  const foldersInfo = await sql.query(`
    SELECT * 
    FROM guardaroba.dbo.tblCartelle ci
  `);

  blob.folders = await Promise.all(
    folders.recordset.map((f) => {
      return new Promise(async (resolve) => {
        const folderInfo = foldersInfo.recordset
          .filter((fi) => fi.key_cart === f.key_cart)
          .pop();

        let res;
        res = await strapi.db.query("api::folder.folder").findOne({
          where: { name: folderInfo?.titolo, is_image_folder: false },
        });

        if (!res) {
          res = await strapi.service("api::folder.folder").create({
            data: {
              createdAt: new Date(folderInfo?.data_creazione),
              name: folderInfo?.titolo,
              is_image_folder: false,
            },
          });
        }

        resolve({
          ...res,
          ...f,
          inventarios: f.inventario?.split(",") || [],
        });
      });
    })
  );

  endImportLog("folders");
};

const imageFoldersImport = async () => {
  startImportLog("imageFolders");
  const folders = await sql.query(`
    SELECT cartella, STRING_AGG(CONVERT(NVARCHAR(max),inventario) , ',') AS inventario, MIN(data_ins) AS data_ins
    FROM guardaroba.dbo.tblFilesPict
    WHERE cartella IS NOT NULL
    GROUP BY cartella 
  `);

  blob.imageFolders = await Promise.all(
    folders.recordset.map((f) => {
      return new Promise(async (resolve) => {
        let res;
        res = await strapi.db.query("api::folder.folder").findOne({
          where: { name: f.cartella, is_image_folder: true },
        });

        if (!res) {
          res = await strapi.service("api::folder.folder").create({
            data: {
              createdAt: new Date(f.data_ins),
              name: f.cartella,
              is_image_folder: true,
            },
          });
        }

        resolve({
          ...res,
          ...f,
          inventarios: f.inventario.split(","),
        });
      });
    })
  );

  endImportLog("imageFolders");
};

const archivesImport = async () => {
  startImportLog("archives");
  const startTime = Date.now();
  const archives = await sql.query(
    `SELECT TOP 30000 * FROM guardaroba.dbo.tblDatiGenerali`
  );
  console.log(`found: ${archives.recordset.length}`);
  const limit = 100;
  for (let i = 0; i < archives.recordset.length; i = i + limit) {
    console.log("importing archives", i, i + limit);
    try {
      await Promise.all(
        archives.recordset.slice(i, i + limit).map((a) => {
          return new Promise(async (resolve, reject) => {
            let res;
            res = await strapi.db.query("api::archive.archive").findOne({
              where: { inventory: a.Inventario },
            });

            let images;
            if (!res) {
              const filesPict = await sql.query(`
              SELECT *
              FROM guardaroba.dbo.tblFilesPict
              WHERE inventario = '${a.Inventario}'
            `);

              images = await Promise.all(
                filesPict.recordset.map((fp) =>
                  imageImportFromFS(fp.filepict, fp.cartella)
                )
              );
            } else {
              console.log(
                `archive ${a.Inventario} already imported, updating...`
              );
            }

            const originalTypology = a.ModelloTipologia.split(";");
            let t_1s = blob.t1.filter((t) => t.tipologia === a.Tipologia);
            let t_2s = originalTypology
              .map((ot) => blob.t2.filter((t) => t.TermineID === +ot))
              .reduce((v, acc) => [...acc, ...v], []);

            // add missing nodes inside the tree
            t_1s = Array.from(
              new Set(t_1s.concat(t_2s.map((t) => t.parent)).map((t) => t?.id))
            );

            const data = {
              createdAt: new Date(a.data_ins),
              is_imported: true,
              size: a.TagliaMisura,
              inventory: a.Inventario,
              // description: a.Descrizione,
              t_1s: t_1s.filter((t) => t),
              t_2s: t_2s.filter((t) => t),
              colors: a.Colore.split(";")
                .map((oc) =>
                  blob.colors.filter((c) => c.key_lval === +oc).map((c) => c.id)
                )
                .reduce((v, acc) => [...acc, ...v], []),
              materials: a.Materiale.split(";")
                .map((om) =>
                  blob.materials
                    .filter((m) => m.TermineID === +om)
                    .map((m) => m.id)
                )
                .reduce((v, acc) => [...acc, ...v], []),
              techniques: a.Tecnica.split(";")
                .map((ot) =>
                  blob.techniques
                    .filter((m) => m.key_lval === +ot)
                    .map((t) => t.id)
                )
                .reduce((v, acc) => [...acc, ...v], []),
              season: blob.seasons.filter(
                (s) => s.primaryKey === +a.Stagione
              )[0]?.id,
              brand: blob.brands.filter((s) => s.primaryKey === +a.Marchio)[0]
                ?.id,
              conservation_status: blob.conservationStatuses.filter(
                (s) => s.primaryKey === +a.StatoConservazione
              )[0]?.id,
              conservation_status_details: a.NoteStatoConservazione,
              year: blob.years.filter((s) => s.primaryKey === +a.Datazione)[0]
                ?.value,
              fantasy: blob.fantasies.filter(
                (s) => s.primaryKey === +a.Fantasia
              )[0]?.id,
              fantasy_details: a.DettFantasia,
              apartment: blob.apartments.filter(
                (s) => s.primaryKey === +a.Collocazione
              )[0]?.id,
              place: blob.places.filter(
                (s) => s.primaryKey === +a.Collocazione1
              )[0]?.id,
              shelf: blob.shelves.filter(
                (s) => s.primaryKey === +a.Collocazione2
              )[0]?.id,
              sector: blob.sectors.filter(
                (s) => s.primaryKey === +a.Collocazione3
              )[0]?.id,
              box: blob.boxes.filter(
                (s) => s.primaryKey === +a.DettaglioCollocazione
              )[0]?.id,
              value: a.Valore,
              is_mock: false,
              note: a.NoteGenerali,
              label: a.EtchettaTxt,
              folders: [
                ...blob.folders
                  .filter((f) => f.inventarios.includes(a.Inventario))
                  .map((f) => f.id),
                ...blob.imageFolders
                  .filter((f) => f.inventarios.includes(a.Inventario))
                  .map((f) => f.id),
              ],
              suit: [], // imported by dedicated function
              loans: [], //  imported by dedicated function
              ...(images && {
                images: images.map((i) => i?.id).filter((i) => !!i),
              }),
            };

            try {
              if (!res) {
                res = await strapi.service("api::archive.archive").create({
                  data,
                });
              } else {
                res = await strapi.entityService.update(
                  "api::archive.archive",
                  res.id,
                  { data }
                );

                console.log("qui", data, res);
              }
            } catch (err) {
              console.error("------>", a.Inventario, err.code);
              blob.archivesWithErrors[a.Inventario] = err;
              reject(err);
            }

            blob.archives[a.Inventario] = {
              ...data,
              ...res,
              ...a,
            };
            resolve();
          });
        })
      );
    } catch (e) {
      console.error(e);
    }
  }
  const endTime = Date.now();
  console.log(`import time: ${Math.round(endTime - startTime) / 1000}s`);
  console.log(`imported: ${Object.keys(blob.archives).length}`);
  console.log(`not imported: ${Object.keys(blob.archivesWithErrors).length}`);
  endImportLog("archives");
};

const miscImport = async () => {
  startImportLog("misc");
  const itemsTBLValori = await sql.query`
    SELECT key_lval, valore, sezione, ordine, datains
    FROM guardaroba.dbo.tblValori
  `;

  const seasons = filterValues(
    itemsTBLValori,
    "sezione",
    "STAGIO",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("seasons", seasons, "api::season.season");

  const brands = filterValues(
    itemsTBLValori,
    "sezione",
    "MARCHI",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("brands", brands, "api::brand.brand");

  const conservationStatuses = filterValues(
    itemsTBLValori,
    "sezione",
    "STCONS",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries(
    "conservationStatuses",
    conservationStatuses,
    "api::conservation-status.conservation-status"
  );

  const fantasies = filterValues(
    itemsTBLValori,
    "sezione",
    "FANTAS",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("fantasies", fantasies, "api::fantasy.fantasy");

  const apartments = filterValues(
    itemsTBLValori,
    "sezione",
    "APPART",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("apartments", apartments, "api::apartment.apartment");

  const places = filterValues(
    itemsTBLValori,
    "sezione",
    "LOCALI",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("places", places, "api::place.place");

  const shelves = filterValues(
    itemsTBLValori,
    "sezione",
    "SCAFFA",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("shelves", shelves, "api::shelf.shelf");

  const sectors = filterValues(
    itemsTBLValori,
    "sezione",
    "SETTOR",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("sectors", sectors, "api::sector.sector");

  const boxes = filterValues(
    // box
    itemsTBLValori,
    "sezione",
    "DETCOL",
    "key_lval",
    "valore",
    false
  );
  await addDbEntries("boxes", boxes, "api::box.box");

  const itemsTBLValoriTree = await sql.query`
    SELECT TermineID, TermineParentID, Livello, Termine, Sezione, Ordine
    FROM guardaroba.dbo.tblValoriTree;
  `;
  blob.years = filterValues(
    itemsTBLValoriTree,
    "Sezione",
    "ANNIDT",
    "TermineID",
    "Termine",
    false
  );

  endImportLog("misc");
};

const filterValues = (
  items,
  filterKey,
  filterValue,
  primaryKey,
  returnKey,
  printEnum
) => {
  const res = items.recordset
    .filter((r) => r[filterKey] === filterValue)
    .map((v) => ({ ...v, value: v[returnKey], primaryKey: v[primaryKey] }));

  if (printEnum) {
    printEnumerationValues(res, returnKey);
  }
  return res;
};

const addDbEntries = async (entityName, entities, serviceName) => {
  startImportLog(entityName);
  console.log(`found: ${entities.length}`);

  blob[entityName] = await Promise.all(
    entities.map((e) => {
      return new Promise(async (resolve) => {
        let res;
        res = await strapi.db.query(serviceName).findOne({
          where: { name: e.value },
        });

        if (!res) {
          res = await strapi.service(serviceName).create({
            data: {
              name: e.value,
            },
          });
        }

        resolve({
          ...res,
          ...e,
        });
      });
    })
  );
  endImportLog(entityName);
};

const printEnumerationValues = (items, key) => {
  console.log(
    items
      .map((i) => i[key])
      .sort((a, b) => (a > b ? 1 : -1))
      .join("\n")
  );
};

const startImportLog = (entityName) => {
  console.log(
    `----------------------- START ${entityName}-----------------------`
  );
};

const endImportLog = (entityName) => {
  console.log(
    `----------------------- END ${entityName}-----------------------`
  );
};

const dbConnection = async () => {
  try {
    // make sure that any items are correctly URL encoded in the connection string
    await sql.connect(
      `Server=${process.env.MSSQL_HOST},${process.env.MSSQL_PORT};Database=${process.env.MSSQL_DB};User Id=${process.env.MSSQL_USER};Password=${process.env.MSSQL_PASSWORD};Encrypt=false`
    );
    console.log("Connected to DB");
  } catch (err) {
    console.error(err);
  }
};

const init = async (cleanAll) => {
  // cleanup
  if (cleanAll) {
    await strapi.db.query("api::t1.t1").deleteMany();
    await strapi.db.query("api::t2.t2").deleteMany();
    await strapi.db.query("api::t3.t3").deleteMany();
    await strapi.db.query("api::t4.t4").deleteMany();
    await strapi.db.query("api::color.color").deleteMany();
    await strapi.db.query("api::material.material").deleteMany();
    await strapi.db.query("api::folder.folder").deleteMany();
    await strapi.db.query("api::technique.technique").deleteMany();
    await strapi.db.query("api::season.season").deleteMany();
    await strapi.db.query("api::brand.brand").deleteMany();
    await strapi.db
      .query("api::conservation-status.conservation-status")
      .deleteMany();
    await strapi.db.query("api::fantasy.fantasy").deleteMany();
    await strapi.db.query("api::apartment.apartment").deleteMany();
    await strapi.db.query("api::room.room").deleteMany();
    await strapi.db.query("api::shelf.shelf").deleteMany();
    await strapi.db.query("api::sector.sector").deleteMany();
    await strapi.db.query("api::box.box").deleteMany();
    await strapi.db.query("plugin::upload.file").deleteMany();
    await strapi.db.query("api::archive.archive").deleteMany();
  }

  await strapi.db.query("api::st1.st1").deleteMany();
  await strapi.db.query("api::suit.suit").deleteMany();
  await strapi.db.query("api::loan.loan").deleteMany();
  await strapi.db.query("api::archive-loan.archive-loan").deleteMany();
  console.log("DB cleaned up");

  blob = {
    t1: [],
    t2: [],
    t3: [],
    t4: [],
    st1: [],
    colors: [],
    folders: [],
    archives: {},
    seasons: [],
    brands: [],
    conservationStatuses: [],
    years: [],
    fantasies: [],
    apartments: [],
    places: [],
    shelves: [],
    sectors: [],
    boxes: [],
    materials: [],
    techniques: [],
    suits: [],
    links: [],
    loans: [],
    loanArchives: [],
    imageFolders: [],
    archivesWithErrors: [],
  };
  console.log("Blob initialized");
};

module.exports = {
  import: importMain,
};
