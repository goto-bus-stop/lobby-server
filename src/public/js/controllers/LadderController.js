define(function (require, exports, module) {

  module.exports = require('ember').ArrayController.extend({

  })
  //Ember.ArrayController.extend({
  //  sortFunction: function (a, b) {
  //    var ladder = this.getWithDefault('currentLadder', 1)
  //    return Ember.compare(a.get('ratings').get(ladder).get('elo'),
  //                         b.get('ratings').get(ladder).get('elo'))
  //  }
  //})

})