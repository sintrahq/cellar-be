'use strict';

/**
 * lot service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lot.lot');
