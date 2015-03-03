define(function (require, exports, module) {

  module.exports = require('ember-data').RESTAdapter.extend({
    namespace: '_'
  , coalesceFindRequests: true
  , findQuery: function (store, type, query) {
      if (query.online === true && Object.keys(query).length === 1) {
        return this.ajax(this.buildURL(type.typeKey) + '/online', 'GET')
      }
      else {
        return this._super(store, type, query)
      }
    }
  })

})