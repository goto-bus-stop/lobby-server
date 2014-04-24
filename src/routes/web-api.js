var api = require('../api');

module.exports = function (app) {

  var uid = 1;
  
  app.get('/games', function (req, res) {
    api.getGames().then(function (rooms) {
      res.json(rooms);
    });
  });

  app.get('/games/:game_id/start', function (req, res) {
    api.startGame(req.params.game_id).then(function (result) {
      res.json(result);
    });
  });
  
  app.post('/games', function (req, res) {
    var options = {
      title: req.body.title,
      descr: req.body.desc,
      maxPlayers: req.body.maxPlayers,
      ladder: req.body.ladder,
      host: uid,
      ip: req.ip
    };
    api.createGame(options)
      .then(function (result) {
        if (result) {
          return api.joinRoom(uid, result);
        }
        else {
          return false;
        }
      })
      .then(function (result) {
        res.json(result);
      });
  });
  
  app.post('/games/:game_id/leave', function (req, res) {
  });
  app.get('/user/:user_id/rating', function (req, res) {
    api.getRating(req.params.user_id).then(function (rate) {
      res.json(rate);
    });
  });
  
  return app;

};