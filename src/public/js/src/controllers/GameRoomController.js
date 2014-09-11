var debugG = debug('aocmulti:controller:gameRoom')

App.GameRoomController = Ember.ObjectController.extend({
  
  ladder: function () {
    return App.get('ladders').findBy('id', parseInt(this.get('model.ladderId'), 10))
  }.property('model.ladderId')
  
, host: function () {
    debugG('get(host)')
    var hostId = parseInt(this.get('model.hostId'), 10)
    return this.get('model.players').find(function (p) {
      return parseInt(p.get('id'), 10) === hostId
    })
  }.property('model.hostId', 'model.players.[]')
, otherPlayers: function () {
    debugG('get(otherPlayers)')
    var hostId = parseInt(this.get('model.hostId'), 10)
    debugG('host=', hostId)
    return this.get('model.players').filter(function (p) {
      debugG('comparing', p.get('id'), hostId)
      return parseInt(p.get('id'), 10) !== hostId
    })
  }.property('host', 'model.players.[]')

, full: Ember.computed.gte('model.players.length', 'model.maxPlayers')

, launchable: Ember.computed.equal('model.status', 'waiting')
, unlaunchable: Ember.computed.not('launchable')

, averageRating: function () {
    var ladder = this.get('model.ladderId')
      , players = this.get('model.players')
      , totalRating = players.reduce(function (rate, player) {
          return rate + get(player.get('ratings')[ ladder ], 'elo')
        }, 0)
    return totalRating / players.length
  }.property('model.players.[]')
  
, hosting: function () {
    debugG('compare', App.get('user.id'), this.get('host.id'),App.get('user.id') == this.get('host.id'))
    debugG('host=', this.get('host'))
    return App.get('user.id') == this.get('host.id')
  }.property('host')

, actions: {
    launch: function () {
      this.set('model.status', 'launching')
      socket.emit('gameRoom:launch', function (e, seskey) {
        debugG('err', e)
        debugG('ses', seskey)
        App.DPRun(seskey)
      })
    }
  }

})
