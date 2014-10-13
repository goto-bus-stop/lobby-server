define(function (require, exports, module) {

  module.exports = require('ember').Route.extend({
    model: function () {
      return this.store.find('mod')
    }
  })

})