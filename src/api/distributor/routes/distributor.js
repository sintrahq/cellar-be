'use strict';

/**
 * distributor router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::distributor.distributor');
