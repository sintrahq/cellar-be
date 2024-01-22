'use strict';

/**
 * shelf service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shelf.shelf');
