var api = require('../api');

module.exports = function (app) {

  app.get('/', function (req, res) {
    if (req.session.uid) {
      api.getLadders().then(function (ladders) {
        res.render('@layout', {
          content: '{{outlet}}',
          uid: req.session.uid,
          ladders: ladders
        });
      });
    }
    else {
      var html = '<!DOCTYPE html><html><body><form action="" method="post"><input name="username" placeholder="username">';
      html += '<input type="password" name="password" placeholder="Password (not used)"><input type="submit"></form></body></html>';
      res.send(html);
    }
  });
  app.post('/', function (req, res) {
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