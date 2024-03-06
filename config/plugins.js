module.exports = ({ env }) => ({
  transformer: {
    enabled: true,
    config: {
      prefix: "/api/",
      responseTransforms: {
        removeAttributesKey: true,
        removeDataKey: true,
      },
    },
  },
  graphql: {
    config: {
      endpoint: "/graphql",
      shadowCRUD: true,
      playgroundAlways: true,
      depthLimit: 15,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
        introspection: true,
      },
    },
  },
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        accessKeyId: env("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env("AWS_ACCESS_SECRET"),
        region: env("AWS_REGION"),
        params: {
          Bucket: env("AWS_BUCKET"),
        },
      },
      breakpoints: {
        xlarge: Math.ceil(1920 * 1.1),
        large: Math.ceil(1280 * 1.2),
        medium: Math.ceil(1024 * 1.2),
        small: Math.ceil(768 * 1.3),
        xsmall: Math.ceil(375 * 1.4),
      },
    },
  },
  placeholder: {
    enabled: true,
    config: {
      size: 64,
    },
  },
  "import-export-entries": {
    enabled: true,
  },
  sentry: {
    enabled: env("NODE_ENV") === "production",
    config: {
      dsn: env("SENTRY_DSN"),
    },
  },
});
