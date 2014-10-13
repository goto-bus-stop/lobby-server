define(function (require, exports, module) {

  var StringUtils = require('ember').String

  module.exports = require('ember-data').RESTAdapter.extend({
    namespace: '_'
  , coalesceFindRequests: true
  })

})