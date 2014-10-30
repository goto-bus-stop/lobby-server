define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:route:gameRoom')

  var Promise = Ember.RSVP.Promise

  module.exports = Ember.Route.extend({
    subscription: null

  , afterModel: function (room) {
      var store = this.store
      this.set('subscription',
        socket.subscribe('gameRoom', function () { })
          .on('playerEntered', function (roomId, playerId) {
            debug('playerEntered', arguments)
            if (roomId === room.get('id')) {
              var player = store.getById('user', playerId)
              if (player) {
                room.get('players.content.content').push(player)
              }
              else {
                room.get('players').reload()
              }
            }
          })
          .on('playerLeft', function (roomId, playerId) {
            debug('playerLeft', arguments)
            if (roomId === room.get('id')) {
              room.get('players').reload()
            }
          })
          .on('hostChanged', function (roomId, playerId) {
            debug('hostChanged', arguments)
            if (roomId === room.get('id')) {
              room.set('host', playerId)
            }
          })
          .on('starting', function (seskey) {
            debug('starting', arguments)
            App.DPRun(seskey)
          })
      )
      return $.post('/_/rooms/' + room.get('id') + '/join')
    }

  , actions: {
      willTransition: function () {
        socket.emit('gameRoom:leave', function () {})
        this.get('subscription').terminate()
      }
    , leave: function () {
        this.transitionTo('index')
      }
    , openSidebar: function () {
        this.render('index', {
          into: 'application',
          outlet: 'sidebar',
          controller: 'gameList'
        })
        App.set('sidebarOpen', true)
      }
    }
  })

})