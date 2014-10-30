define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:controller:gameRoom')

  var get = Ember.get

  module.exports = Ember.ObjectController.extend({

    ladder: function () {
      return App.get('ladders').findBy('id', parseInt(this.get('model.ladderId'), 10))
    }.property('model.ladderId')

  , otherPlayers: function () {
      var model = this.get('model')
      // 'host' is a resolved promise at this point, the actual User model
      // is in its content property
      return model.get('players').without(model.get('host.content'))
    }.property('model.host', 'model.players.[]')

  , full: Ember.computed.gte('model.players.length', 'model.maxPlayers')

  , launchable: function () {
      var st = this.get('model.status')
      return st === 'waiting' || st == null
    }.property('model.status')

  , unlaunchable: Ember.computed.not('launchable')

  , averageRating: function () {
      var ladder = this.get('model.ladderId')
        , players = this.get('model.players')
        , totalRating = 0
      return totalRating / players.length
    }.property('model.players.[]')

  , hosting: function () {
      // "As long as I don't break these… Promises"
      return App.get('user') === this.get('model.host.content')
    }.property('model.host.content')

  , actions: {
      launch: function () {
        this.set('model.status', 'launching')
        socket.emit('gameRoom:launch', function (e, seskey) {
          debug('err', e)
          debug('ses', seskey)
          App.DPRun(seskey)
        })
      }
    }

  })

})