define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:route:index')

  var get = Ember.get

  module.exports = Ember.Route.extend({
    setupController: function (controller) {
      var store = this.store
      this.store.find('room').then(function (games) {
        controller.set('games', games)
      })

      socket.subscribe('gameRoom')
        .on('created', function (room) {
          debug('creating', room)
          store.find('room', room).then(function () {
            controller.set('games', store.all('room'))
          })
        })
        .on('destroyed', function (roomIds) {
          debug('destroying', roomIds)
          roomIds.forEach(function (id) {
            var destroyedRoom = store.getById('room', id)
            debug('room:', destroyedRoom)
            destroyedRoom && store.unloadRecord(destroyedRoom)
          })
          controller.set('games', store.all('room'))
        })
    }

  , actions: {
      createGame: function () {
        var data = this.get('controller.gameData')
          , options = {
              title: get(data, 'title')
            , descr: get(data, 'descr')
            , maxPlayers: get(data, 'maxPlayers')
            , ladderId: get(data, 'ladder')
            , hostId: App.get('user.id')
            }
        this.set('sendingRequest', true)
        var record = this.store.createRecord('room', options)
        record.save()
          .then(function (x) {
            $('#create-game-modal').modal('hide')
            this.set('sendingRequest', false)
            this.transitionTo('room', record.get('id'))
          }.bind(this))
          .catch(function (e) {
            throw e
          })
      }
    }
  })

})