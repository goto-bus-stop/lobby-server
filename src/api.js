var when = require('when'),
    sequence = require('when/sequence');
var _ = require('lodash');

var sql = require('./sql');
var PubSub = require('./PubSub');
var debug = require('debug')('api');

function generateSeskey() {
  var l = 10,
      chars = '1234567890abcdef',
      str = '';
  while (l--) {
    str += chars[ Math.floor(Math.random() * chars.length) ];
  }
  return pad(_.now().toString(16), 13) + str;
  
  function pad(x, l) {
	while (x.length < l) x += '0';
	return x;
  }
}

function withRatings(user) {
  if (Array.isArray(user)) {
    var users = _.indexBy(user, 'id');
    return getRatings(Object.keys(user)).then(function (ratings) {
      ratings.forEach(function (rating) {
        if (!users[rating.user_id].ratings) {
          users[rating.user_id].ratings = {};
        }
        users[rating.user_id].ratings[rating.ladder_id] = rating;
      });
      return user;
    });
  }
  return getRatings(user.id).then(function (ratings) {
    user.ratings = {};
    ratings.forEach(function (rating) {
      user.ratings[rating.ladder_id] = rating;
    });
    return user;
  });
}

function getUser(id) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE id = ?', [ id ]);
  })
  .then(function (rows) {
    return withRatings(rows[0]);
  })

  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function searchUser(data) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE ?', [ data ]);
  })
  .then(function (rows) {
    return withRatings(rows);
  })
  
  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function getUsers() {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users')
  })
  
  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function getLadders() {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT * FROM ladders');
  })
  
  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function getGame(id) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    var s = sequence([
      function () { return sql.query(_conn, 'SELECT r.*, l.name AS ladder_name FROM rooms r, ladders l WHERE r.id = ? AND l.id = r.ladder_id', [ id ]) },
      function () { return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE in_room_id = ?', [ id ]) }
    ]);
    return s;
  })
  .then(function (args) {
    var room = args[0][0], players = args[1];
    room.players = players;
    return room;
  })
  
  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function getGames() {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    var s = sequence([
      function () { return sql.query(_conn, 'SELECT r.*, l.name AS ladder_name FROM rooms r, ladders l WHERE l.id = r.ladder_id') },
      function () { return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE in_room_id IS NOT NULL') }
    ]);
    return s;
  })
  .then(function (args) {
    var rooms = args[0], users = args[1];
    rooms.forEach(function (room) {
      room.players = _.where(users, { in_room_id: room.id });
    });
    return rooms;
  })
  
  .catch(function (e) {
    debug(e.message);
  })
  .finally(function () {
    _conn.release();
  });
}
function createGame(options) {
  // options { title, desc, max_players, ladder_id, host_id, ip }
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn,
      'INSERT INTO rooms (title, descr, max_players, ladder_id, host_id, ip) ' +
      'VALUES (?, ?, ?, ?, ?, ?)', [ options.title, options.descr, options.maxPlayers, options.ladder, options.host, options.ip ]);
  })
  .then(function (q) {
    PubSub.publish('game-created', _.merge({ id: q.insertId }, options));
    return q.insertId;
  })
  .catch(function (e) {
    debug(e.message);
    return false;
  })
  
  .finally(function () {
    _conn.release();
  });
}
function startGame(id) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    var s = sequence([
      function () {
        return sql.query(_conn, 'UPDATE rooms SET status = ? WHERE id = ?', [ 'playing', id ]);
      },
      function () { 
        return sql.query(_conn, 'SELECT * FROM users WHERE in_room_id = ?', [ id ]);
      }
    ]);
    return s;
  })
  .then(function (args) {
    var sessions = args[1].map(function (player) {
      return [ generateSeskey(), id, player.id ];
    });
    return sql.query(_conn, 'INSERT INTO sessions (seskey, room_id, user_id) VALUES ' +
                 sessions.map(function (sess) { return '(' + sql.mysql.escape(sess) + ')' }).join(', '));
  })
  .then(function () {
    PubSub.publish('game-starting', id);
    return true;
  })
  .catch(function (e) {
    debug(e.message);
    return false;
  })
  
  .finally(function () {
    _conn.release();
  });
}
function getRating(uid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT elo FROM ratings WHERE user_id = ?', [ uid ]);
  })
  .then(function (ratings) {
    return ratings[0].elo;
  })
  .catch(function () {
    debug(e.message);
    return false;
  })
  
  .finally(function () {
    _conn.release();
  });
}
function getRatings(uid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    if (Array.isArray(uid)) {
      return sql.query(_conn, 'SELECT * FROM ratings WHERE user_id IN(?)', [ uid ]);
    }
    else {
      return sql.query(_conn, 'SELECT * FROM ratings WHERE user_id = ?', [ uid ]);
    }
  })
  .catch(function () {
    debug(e.message);
    return false;
  })
  
  .finally(function () {
    _conn.release();
  });
}
function cleanupRooms(rid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 
      'SELECT id FROM rooms WHERE id NOT IN(' +
        'SELECT DISTINCT in_room_id FROM users WHERE in_room_id IS NOT NULL)');
  })
  .then(function (u) {
    var rids = [];
    u.forEach(function (row) {
      rids.push(row.id);
    });
    if (rids.length > 0) {
      console.log('destroying', rids);
      PubSub.publish('room-destroyed', rids);
      return sql.query(_conn, 'DELETE FROM rooms WHERE id IN(?)', [ rids ]);
    }
  })
  
  .finally(function () {
    _conn.release();
  });
}
function joinRoom(uid, rid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT in_room_id FROM users WHERE id = ?', [ uid ]);
  })
  .then(function (u) {
    if (u[0].in_room_id != null) {
      PubSub.publish('room-left', uid, u[0].in_room_id);
    }
  })
  .then(function () {
    return sql.query(_conn, 'UPDATE users SET in_room_id = ? WHERE id = ?', [ rid, uid ]);
  })
  .then(function () {
    process.nextTick(cleanupRooms);
    PubSub.publish('room-joined', uid, rid);
    return true;
  })
  .catch(function (e) {
    console.log(e.stack);
    return false;
  })
  
  .finally(function () {
    _conn.release();
  });
}
function leaveRoom(uid, rid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT in_room_id FROM users WHERE id = ?', [ uid ]);
  })
  .then(function (rows) {
    if (rows[0].in_room_id != null) {
      PubSub.publish('room-left', uid, rows[0].in_room_id);
      return sql.query(_conn, 'UPDATE users SET in_room_id = NULL WHERE id = ?', [ uid ]);
    }
  })
  .then(function () {
    return true;
  })
  .catch(function () {
    return false;
  })
  
  .finally(function () {
    process.nextTick(cleanupRooms);
    _conn.release();
  });
}

function online(uid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT * FROM online WHERE user_id = ?', [ uid ]);
  })
  .then(function (rows) {
    if (rows.length === 0) {
      PubSub.publish('user-joined', uid);
      return sql.query(_conn, 'INSERT INTO online (user_id) VALUES (?)', [ uid ]);
    }
  })
  
  .finally(function () {
    _conn.release();
  });
}
function offline(uid) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'DELETE FROM online WHERE user_id = ?', [ uid ]);
  })
  .then(function () {
    PubSub.publish('user-left', uid);
  })
  
  .finally(function () {
    _conn.release();
  });
}
function getOnlineUsers() {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT u.id, u.username, u.country, u.status, u.in_room_id FROM users u, online o WHERE u.id = o.user_id');
  })
  .then(function (rows) {
    return withRatings(rows);
  })
  
  .finally(function () {
    _conn.release();
  });
}

exports.getUser = getUser;
exports.getUsers = getUsers;
exports.searchUser = searchUser;
exports.getLadders = getLadders;
exports.getGame = getGame;
exports.getGames = getGames;
exports.createGame = createGame;
exports.startGame = startGame;
exports.getRating = getRating;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.cleanupRooms = cleanupRooms;

exports.online = online;
exports.offline = offline;
exports.getOnlineUsers = getOnlineUsers;