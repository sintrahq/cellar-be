'use strict';

/**
 * distributor service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::distributor.distributor');
