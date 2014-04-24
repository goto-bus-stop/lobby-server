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
  
  app.post('/finish-game', function(req, res) {
  });
  
  return app;
};