App.GameRoom = Ember.Object.extend({
  players: [],

  init: function () {
    var self = this;
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
    this.set('ladder', App.ladders.findBy('id', parseInt(this.get('ladder'), 10)));
    App.User.find(this.get('host_id')).then(function (host) {
      self.set('host', host);
    });
  },
  
  otherPlayers: (function () {
    var hostId = this.get('host_id');
    return this.get('players').filter(function (p) {
      return p.get('id') !== hostId;
    });
  }).property('players.@each.id'),
  full: (function () {
    return this.get('players.length') >= this.get('max_players');
  }).property('players.length', 'max_players'),
  unlaunchable: (function () {
    return this.get('status') !== 'waiting';
  }).property('status'),
});

App.GameRoom.find = function (id) {
  id = parseInt(id, 10);
  return new Ember.RSVP.Promise(function (resolve) {
    var game = App.get('games').findBy('id', id);
    if (!game) {
      socket.emit('api:game', id, function (game) {
        game = App.GameRoom.create(game);
        App.get('games').pushObject(game);
        resolve(game);
      });
    }
    else {
      resolve(game);
    }
  });
};