define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:route:gameRoom')

  var Promise = Ember.RSVP.Promise

  module.exports = Ember.Route.extend({
    subscription: null

  , model: function (params) {
      return this.store.find('room', params.room_id)
    }

  , afterModel: function (room) {
      return new Promise(function (resolve, reject) {
        socket.emit('gameRoom:join', room.get('id'), App.promisify(resolve, reject))

        this.set('subscription',
          socket.subscribe('gameRoom', function () { })
            .on('playerEntered', function () {
              debug('playerEntered', arguments)
              room.reload()
            })
            .on('playerLeft', function () {
              debug('playerLeft', arguments)
              room.reload()
            })
            .on('hostChanged', function () {
              debug('hostChanged', arguments)
              room.reload()
            })
            .on('starting', function (seskey) {
              debug('starting', arguments)
              App.DPRun(seskey)
            })
        )
      }.bind(this))

      var reload = function () {
        debug('reloading')
        room.reload().then(function () {
          room.propertyWillChange('data')
          data = room._data;
          room.eachRelationship(function (key, rel) {
            debug('relationship', key)
            if (data.players && data.players[key]) {
              if (rel.options.async) {
                room._relationships[key] = null
              }
            }
          })
          room.propertyDidChange('data')
          // reload all players >_<
  //        return room.get('players').then(function (players) {
  //          return Promise.all([ players.invoke('reload') ])
  //        })
        })
      }

      if (room.get('locked')) {
        return App.prompt(room.get('title'), 'Password', 'password')
          .then(function OKed(passw) {
            if (passw !== /* @todo MAKE THIS. */'password') {
              throw new Error('Incorrect password for room #' + room.get('id'))
            }
          }, function (e) {
            this.transitionTo('index')
            App.notify({ type: 'error', message: e.message })
          }.bind(this))
      }
      debug('afterPromise')
      debug('players right afterPromise', room.get('players').mapBy('id'))
      return new Promise(function(res){res()})
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