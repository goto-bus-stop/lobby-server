var _ = require('lodash'),
    Ember = require('../ember'),
    Model = require('../Model'),
    User = require('./User'),
    sql = require('../sql');

var GameRoom = Model.extend({
  players: [],

  init: function () {
    var self = this;
//    this.set('ladder', App.ladders.findBy('id', parseInt(this.get('ladder'), 10)));
    User.find(this.get('host_id')).then(function (host) {
      self.set('host', host);
    });
  },
  
  otherPlayers: (function () {
    var hostId = this.get('host_id');
    return this.get('players').filter(function (p) {
      return p.get('id') !== hostId;
    });
  }).property('players.@each.id'),
  full: Ember.computed.gte('players.length', 'max_players'),
  unlaunchable: (function () {
    return this.get('status') !== 'waiting';
  }).property('status'),
});

App.GameRoom.query = function (data) {
  if (typeof data === 'number') data = { id: data };
  return sql.query(_conn,
     'SELECT *, ' +
     'FROM games ' +
     'WHERE ?', [ data ]
  );
};