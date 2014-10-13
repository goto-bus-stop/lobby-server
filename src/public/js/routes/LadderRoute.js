define(function (require, exports, module) {

  var Ember = require('ember')

  var get = Ember.get

  module.exports = Ember.Route.extend({
    model: function (params) {
      return { ladder: App.get('ladders').findBy('id', parseInt(params.ladder_id, 10)) }
    }
  //, setupController: function (controller, model) {
  //    controller.set('currentLadder', get(model, 'ladder.id'))
  //    this.store.find('user').then(function (players) {
  //      controller.set('content', players)
  //    })
  //  }
  })

})