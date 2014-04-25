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
      api.getUsers().then(function (users) {
        var html = '<!DOCTYPE html><html><body><form action="" method="post"><select name="uid">';
        users.forEach(function (u) {
          html += '<option value="' + u.id + '">' + u.username + '</option>';
        });
        html += '</select><input type="submit"></form></body></html>';
        res.send(html);
      })
    }
  });
  app.post('/', function (req, res) {
    req.session.uid = req.body.uid;
    res.redirect('/');
  });
  
};