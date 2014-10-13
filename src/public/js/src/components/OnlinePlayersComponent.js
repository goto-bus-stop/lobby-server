var Ember = require('ember')
  , debug = require('debug')('aocmulti:component:onlinePlayers')

module.exports = Ember.Component.extend({
  classNames: [ 'component', 'online-players' ]

, onConnected: function (userIds) {
    this.set('onlinePlayers', [])
    
    var onlinePlayers = this.get('onlinePlayers')
    this.store.find('user', { online: true }).then(function (players) {
      onlinePlayers.clear()
      onlinePlayers.pushObjects(players.toArray())
    })
  }.on('connected')

, onJoin: function (p) {
    this.store.find('user', p).then(function (x) {
      this.get('onlinePlayers').pushObject(x)
    }.bind(this))
  }.on('join')

, onLeave: function (p) {
    var onlinePlayers = this.get('onlinePlayers')
    onlinePlayers.any(function (online, i) {
      if (online.get('id') === p.id) {
        onlinePlayers.removeAt(i)
        return true
      }
    })
  }.on('leave')

, connect: function () {
    this.onJoinBound = this.trigger.bind(this, 'join')
    this.onLeaveBound = this.trigger.bind(this, 'leave')
    this.set('subscription',
      socket.subscribe('onlinePlayers', this.trigger.bind(this, 'connected'))
        .on('joined', this.onJoinBound)
        .on('left', this.onLeaveBound)
    )
  }.on('willInsertElement')

, disconnect: function () {
    this.get('subscription').terminate()
    this.trigger('disconnected')
  }.on('willDestroyElement')
})