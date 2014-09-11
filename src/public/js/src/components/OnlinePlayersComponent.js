var debugO = debug('aocmulti:component:onlinePlayers')

App.OnlinePlayersComponent = Ember.Component.extend({
  tagName: 'ul'
, classNames: [ 'list-unstyled' ]
  
, onConnected: function (userIds) {
    this.set('onlinePlayers', [])
    var onlinePlayers = this.get('onlinePlayers')
      , store = this.store
    socket.emit('onlinePlayers:list', function (err, ids) {
      if (err) debugO(err)
      else {
        store.find('user', { id: ids }).then(function (players) {
          onlinePlayers.clear()
          onlinePlayers.pushObjects(players.toArray())
        })
      }
    })
    debugO(this)
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