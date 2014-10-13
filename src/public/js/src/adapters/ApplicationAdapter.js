var StringUtils = require('ember').String

module.exports = require('ember-data').RESTAdapter.extend({
  namespace: '_'
, coalesceFindRequests: true
})