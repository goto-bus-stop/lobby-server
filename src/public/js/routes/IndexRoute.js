define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:route:index')

  var get = Ember.get

  module.exports = Ember.Route.extend({
    setupController: function (controller) {
      this.store.find('room').then(function (games) {
        controller.set('games', games)
      })

      socket.subscribe('gameRoom')
        .on('created', function (room) {
          controller.get('games').pushObject(room)
        })
        .on('destroyed', function (roomIds) {
          var l = roomIds.length
          var games = controller.get('games').reject(function (room) {
            var roomId = get(room, 'id')
              , i
            for (i = 0; i < l; i++) {
              if (roomId == roomIds[i]) {
                return true
              }
            }
            return false
          })
          controller.set('games', games)
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
        if (options.title.length <= 5) {
          alert('That\'s not a very inspiring title, please make it looooooonger :(')
          return
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