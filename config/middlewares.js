module.exports = (env) => [
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "dl.airtable.com",
            `${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "dl.airtable.com",
            `${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      header: "*",
      origin: [
        "http://localhost:1337",
        "http://localhost:4110",
        "http://localhost:4111", 
        "https://mpa-staging.sintrasviluppo.it",
        "https://mpa-be-staging.sintrasviluppo.it",
        "https://mpa.sintrasviluppo.it",
        "https://mpa-be.sintrasviluppo.it",
        "https://pvs-staging.sintrasviluppo.it",
        "https://pvs-be-staging.sintrasviluppo.it",
        "https://pvs.sintrasviluppo.it",
        "https://pvs-be.sintrasviluppo.it",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      headers: [
        "Content-Type",
        "Authorization",
        "X-Frame-Options",
        "Origin",
        "Access-Control-Allow-Headers",
        "Language",
      ],
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  {
    name: "strapi::compression",
    config: {
      br: false,
    },
  },
];
