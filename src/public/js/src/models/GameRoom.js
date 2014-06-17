App.GameRoom = Ember.Object.extend({
  players: [],

  _init: function () {
    var self = this,
        gamesStore = App.store.get('games');
    if (!gamesStore.findBy('id', this.get('id'))) {
      gamesStore.pushObject(this);
    }
    this.set('players', Ember.A(
      this.get('players').map(function (p) {
        if (p instanceof App.User) {
          return p;
        }
        else {
          return App.User.create(p);
        }
      })
    ));
    this.set('ladder', App.ladders.findBy('id', parseInt(this.get('ladder_id'), 10)));
    App.User.find(this.get('host_id')).then(function (host) {
      self.set('host', host);
    });
  }.on('init'),
  
  otherPlayers: (function () {
    var hostId = this.get('host_id');
    return this.get('players').filter(function (p) {
      return p.get('id') !== hostId;
    });
  }).property('players.@each.id'),
  full: Ember.computed.gte('players.length', 'max_players'),
  launchable: Ember.computed.equal('status', 'waiting'),
  unlaunchable: Ember.computed.not('launchable')
});

App.store.set('games', Ember.A());
App.GameRoom.find = function (id) {
  id = parseInt(id, 10);
  var gamesStore = App.store.get('games'),
      game = gamesStore.findBy('id', id);
  return new Ember.RSVP.Promise(function (resolve) {
    if (game) return resolve(game);
    socket.emit('api:game', id, function (game) {
      game = App.GameRoom.create(game);
      resolve(game);
    });
  });
};
