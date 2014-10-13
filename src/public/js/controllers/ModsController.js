define(function (require, exports, module) {

  var Ember = require('ember')

  module.exports = Ember.ArrayController.extend({
    mods: Ember.A()
  })

})