const api = require('../api'),
      pp = require('passport'),
      fs = require('fs'),
      path = require('path'),
      when = require('when'),
      glob = require('glob');

module.exports = function (app) {

  app.get('/test', function (req, res) {
    require('../models/User').create({
      id: 1,
      username: 'AAAA',
      password: '$2a$10$n/EXfVqXu9WeuT5lgozJXOG3xgP4ykt/vLaJTNxqNUjOXbfL05ysq',
      country: 'vn',
      status: 'avail',
      in_room_id: null,
      online_in: '1,2'
    });
  });
  
  app.get('/', function (req, res) {
    if (req.session.uid) {
      var templates = when.promise(function (resolve, reject) {
        var baseDir = path.join(__dirname, '../templates');
        glob(baseDir + '{/**/*,*}.handlebars', function (err, files) {
          if (err) return reject(err);
          resolve(
            files
              .map(function (f) {
                return f.substr(baseDir.length + 1).replace(/\.handlebars$/, '');
              })
              .filter(function (f) {
                return f.charAt(0) !== '@';
              })
          );
        });
      });
      when.join(api.getLadders(), api.getServers(), templates).then(function (result) {
        var ladders = result[0], servers = result[1], templates = result[2];
        res.render('@layout', {
          content: '{{outlet}}',
          uid: req.session.uid,
          ladders: ladders,
          servers: servers,
          templates: templates
        });
      });
    }
    else {
      api.getServers().then(function (servers) {
        res.render('@login', {
          servers: servers
        });
      });
    }
  });
  app.post('/', pp.authenticate('local'), function (req, res) {
    api.searchUser({ username: req.body.username.trim() })
      .then(function (users) {
        if (users.length > 0) {
          req.session.uid = users[0].id;
          res.redirect('/');
        }
        else {
          throw new Error();
        }
      })
      .catch(function () {
        res.send('That user no exists!!!1!!');
      });
  });
  
};