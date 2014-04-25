var when = require('when'),
    sequence = require('when/sequence');
var _ = require('lodash');

var sql = require('./sql');
var PubSub = require('./PubSub');

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

function getUser(id) {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE id = ?', [ id ]);
  })
  .then(function (rows) {
    return rows[0];
  })
  
  .catch(function (e) {
    console.log(e.stack);
  })
  .finally(function () {
    _conn.release();
  });
}
function getUsers() {
  var _conn;
  return sql.getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users');
  })
  
  .catch(function (e) {
    console.log(e.stack);
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
    console.log(e.stack);
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
      function () { return sql.query(_conn, 'SELECT * FROM rooms WHERE id = ?', [ id ]) },
      function () { return sql.query(_conn, 'SELECT id, username, country, status, in_room_id FROM users WHERE in_room_id IS ?', [ id ]) }
    ]);
    return s;
  })
  .then(function (args) {
    var room = args[0][0], players = args[1];
    room.players = players;
    return room;
  })
  
  .catch(function (e) {
    console.log(e.stack);
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
      function () { return sql.query(_conn, 'SELECT * FROM rooms') },
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
    console.log(e.stack);
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
  .catch(function () {
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
    console.log(e.stack);
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
    return sql.query(_conn, 'SELECT id FROM rooms WHERE id NOT IN(SELECT DISTINCT in_room_id FROM users)').then(function (u) {
      var rids = [];
      console.log(rids);
      u.forEach(function (row) {
        rids.push(row.id);
      });
      PubSub.publish('room-destroyed', rids);
      return sql.query(_conn, 'DELETE FROM rooms WHERE id IN(?)', [ rids ]);
    });
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
    console.log(rows);
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

exports.getUser = getUser;
exports.getUsers = getUsers;
exports.getLadders = getLadders;
exports.getGame = getGame;
exports.getGames = getGames;
exports.createGame = createGame;
exports.startGame = startGame;
exports.getRating = getRating;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.cleanupRooms = cleanupRooms;