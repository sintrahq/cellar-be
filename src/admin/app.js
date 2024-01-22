export default {
  config: {
    //   // Replace the Strapi logo in auth (login) views
    //   auth: {
    //     logo: AuthLogo,
    //   },
    //  // Replace the favicon
    //   head: {
    //     favicon: favicon,
    //   },
    //   // Replace the Strapi logo in the main navigation
    //   menu: {
    //     logo: MenuLogo,
    //   },
    locales: [
      "en",
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      "it",
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
    ],
    // Disable video tutorials
    tutorials: false,
    // Disable notifications about new Strapi releases
    notifications: { release: false },
  },
  bootstrap(app) {
    console.log(app);
  },
};
