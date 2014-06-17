var sql = require('../sql'),
    PubSub = require('../PubSub');


module.exports = function (app) {
  
  app.post('/join', function (req, res) {
    var _conn;
    sql.getConnection().then(function (conn) { _conn = conn; })
  
    .then(function () {
      return sql.query(_conn,
        'SELECT u.username, r.ip, r.max_players ' +
        'FROM sessions s, users u, rooms r ' +
        'WHERE s.seskey = ? AND u.id = s.user_id AND r.id = s.room_id'
      , req.params.seskey);
    })
    .then(function (session) {
      res.json(session[0]);
    })
  
    .finally(function () {
      _conn.release();
    });
  });
  
  app.post('/ready', function (req, res) {
    var _conn;
    var seskey = req.params.seskey;
    sql.getConnection().then(function (conn) { _conn = conn; })
    
    .then(function () {
      return sql.query(_conn, 'SELECT room_id FROM sessions WHERE seskey = ?', [ seskey ]);
    })
    .then(function (rows) {
      var r = rows[0];
      PubSub.publish('game-ready', r.room_id);
      res.json(true);
    })
    .catch(function () {
      res.json(false);
    })
    
    .finally(function () {
      _conn.release();
    });
  });
  
  app.post('/finish-game', function(req, res) {
  });
  
  return app;
};