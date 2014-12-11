define(function (require, exports, module) {

  var Ember = require('ember')
    , $ = require('jquery')

  module.exports = Ember.Route.extend({
    activate: function () {
      $.post('/_/logout')
    }
  })

})