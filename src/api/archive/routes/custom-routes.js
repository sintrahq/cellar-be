"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/archives/custom/bulk-update",
      handler: "custom-controller.bulkUpdate",
    },
  ],
};
