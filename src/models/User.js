var _ = require('lodash'),
    Model = require('../Model'),
    sql = require('../sql'),
    api = require('../api');

var User = Model.extend({
  servers: function () {
    return this.get('online_in').split(',').map(function (serverId) {
      return parseInt(serverId, 10);
    });
  }.property('online_in'),
  toJSON: function () {
    return {
      username: this.get('username'),
      country: this.get('country'),
      status: this.get('status'),
      in_room: this.get('in_room_id'),
      servers: this.get('servers')
    };
  }
});

User.query = function (data) {
  var _conn;
  return sql.query(_conn,
     'SELECT u.*, ' +
     // `online in server` ids
     'GROUP_CONCAT((SELECT o.server_id FROM online o WHERE o.user_id = u.id)) AS online_in ' +
     'FROM users u ' +
     'WHERE ?', [ sql.prefixKeys(data, 'u') ]
  ).then(function (rows) {
    return api.withRatings(rows);
  });
};

User.find = function (id) {
  return User.query({ id: id });
};

module.exports = User;