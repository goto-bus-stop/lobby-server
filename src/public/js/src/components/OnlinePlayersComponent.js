App.OnlinePlayersComponent = Ember.Component.extend({
  tagName: 'ul',
  classNames: [ 'list-unstyled' ],
  
  onlinePlayers: Ember.A(),
  
  onConnected: function (userIds) {
    var onlinePlayers = this.get('onlinePlayers');
    socket.emit('api:online', function (p) {
      onlinePlayers.clear();
      Ember.RSVP.all(
        p.map(function (u) {
          return App.User.find(u);
        })
      ).then(function (players) {
        onlinePlayers.pushObjects(players);
      });
    });
  },
  onDisconnected: function () {
  },
  onJoin: function (p) {
    this.get('onlinePlayers').pushObject(App.User.find(p));
  },
  onLeave: function (p) {
    var onlinePlayers = this.get('onlinePlayers');
    onlinePlayers.any(function (online, i) {
      if (online.get('id') === p.id) {
        onlinePlayers.removeAt(i);
        return true;
      }
    });
  },
  
  connect: function () {
    socket.emit('subscribe', 'online-players', this.onConnected.bind(this));
    this.onJoinBound = this.onJoin.bind(this);
    this.onLeaveBound = this.onLeave.bind(this);
    socket.on('online-players:join', this.onJoinBound);
    socket.on('online-players:leave', this.onLeaveBound);
  }.on('didInsertElement'),
  disconnect: function () {
    socket.emit('unsubscribe', 'online-players', this.onDisconnected.bind(this));
    socket.off('online-players:join', this.onJoinBound);
    socket.off('online-players:leave', this.onLeaveBound);
  }.on('willDestroyElement'),
});