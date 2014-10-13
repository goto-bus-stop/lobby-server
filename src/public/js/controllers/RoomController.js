define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:controller:gameRoom')

  var get = Ember.get

  module.exports = Ember.ObjectController.extend({

    ladder: function () {
      return App.get('ladders').findBy('id', parseInt(this.get('model.ladderId'), 10))
    }.property('model.ladderId')

  , host: function () {
      var hostId = parseInt(this.get('model.hostId'), 10)
        , players = this.get('model.players')

      return players.find(function (p) {
        return parseInt(p.get('id'), 10) === hostId
      })
    }.property('model.hostId', 'model.players.[]')

  , otherPlayers: function () {
      var hostId = parseInt(this.get('model.hostId'), 10)
        , players = this.get('model.players')

      return players.filter(function (p) {
        return parseInt(p.get('id'), 10) !== hostId
      })
    }.property('host', 'model.players.[]')

  , full: Ember.computed.gte('model.players.length', 'model.maxPlayers')

  , launchable: function () {
      var st = this.get('model.status')
      return st === 'waiting' || st == null
    }.property('model.status')

  , unlaunchable: Ember.computed.not('launchable')

  , averageRating: function () {
      var ladder = this.get('model.ladderId')
        , players = this.get('model.players')
        , totalRating = players.reduce(function (rate, player) {
            return rate + get(player.get('ratings')[ladder], 'elo')
          }, 0)
      return totalRating / players.length
    }.property('model.players.[]')

  , hosting: function () {
      return App.get('user.id') == this.get('host.id')
    }.property('host')

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