var express = require('express');
var cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    csurf = require('csurf'),
    logger = require('morgan');
var socketio = require('socket.io');
var mysql = require('mysql');
var when = require('when');
var nodefn = require('when/node');
var sequence = require('when/sequence');
var _ = require('lodash');
var app = express();

var COOKIE_SECRET = 'our_top_secret_cookie_signing_key';

app.use(logger());
app.use(cookieParser());
app.use(session({ secret: COOKIE_SECRET, key: 'sid' }));
app.use(bodyParser());

// MySQL
var pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lobbyserver'
});
function query(conn) {
  var args = [].slice.call(arguments, 1);
  return when.promise(function (resolve, reject, notify) {
    args.push(function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
    conn.query.apply(conn, args);
  });
}
function getConnection() {
  return when.promise(function (resolve, reject, notify) {
    pool.getConnection(function (err, conn) {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

// random game session key helper
function generateSeskey() {
  var l = 10,
      chars = '7531902468abcdef',
      str = '';
  while (l--) {
    str += chars[ Math.floor(Math.random() * chars.length) ];
  }
  return str;
}

// Web App API
app.get('/games', function (req, res) {
  var _conn;
  getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    var s = sequence([
      function () { return query(_conn, 'SELECT * FROM rooms') },
      function () { return query(_conn, 'SELECT * FROM users WHERE in_room_id IS NOT NULL') }
    ]);
    return s;
  })
  .then(function (args) {
    var rooms = args[0], users = args[1];
    rooms.forEach(function (room) {
      room.players = _.where(users, { in_room_id: room.id });
    });
    res.json(rooms);
  })
  
  .catch(function (e) {
    console.log(e.stack);
  })
  .finally(function () {
    _conn.release();
  });
});
app.get('/games/:game_id/start', function (req, res) {
  var _conn;
  getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    var s = sequence([
      function () { return query(_conn, 'UPDATE rooms SET status = ? WHERE id = ?', [ 'playing', req.params.game_id ]) },
      function () { return query(_conn, 'SELECT * FROM users WHERE in_room_id = ?', [ req.params.game_id ]) }
    ]);
    return s;
  })
  .then(function (args) {
    var sessions = args[1].map(function (player) {
      return [ generateSeskey(), req.params.game_id, player.id ];
    });
    return query(_conn, 'INSERT INTO sessions (seskey, room_id, user_id) VALUES ' +
                 sessions.map(function (sess) { return '(' + mysql.escape(sess) + ')' }).join(', '));
  })
  .then(function () {
    res.json(true);
  })
  .catch(function (e) {
    console.log(e.stack);
    res.json(false);
  })
  
  .finally(function () {
    _conn.release();
  });
});
app.post('/games/:game_id/leave', function (req, res) {
});
app.get('/user/:user_id/rating', function (req, res) {
  var _conn;
  getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return query(_conn, 'SELECT elo FROM ratings WHERE user_id = ?', [ req.params.user_id ]);
  })
  .then(function (ratings) {
    res.json(ratings[0].elo);
  })
  .catch(function () {
    res.json(false);
  })
  
  .finally(function () {
    res.end();
    _conn.release();
  });
});

// Client API
app.get('/_CLIENT/join/:seskey', function (req, res) {
  console.log(req.params.seskey)
  var _conn;
  getConnection().then(function (conn) { _conn = conn; })
  
  .then(function () {
    return query(_conn,
      'SELECT u.username, r.ip, r.max_players ' +
      'FROM sessions s, users u, rooms r ' +
      'WHERE s.seskey = ? AND u.id = s.user_id AND r.id = s.room_id'
    , req.params.seskey);
  })
  .then(function (session) {
    console.log(session);
    res.json(session[0]);
  })
  
  .finally(function () {
    _conn.release();
  });
});

var server = app.listen(3020, function () {
  console.log('Listening on port %d', server.address().port);
});