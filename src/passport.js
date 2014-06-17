const api = require('./api'),
      bcrypt = require('bcryptjs'),
      LocalStrategy = require('passport-local').Strategy,
      debug = require('debug')('passport');

module.exports = function (pp) {
  pp.serializeUser(function(user, done) {
    done(null, user.id);
  });

  pp.deserializeUser(function(id, done) {
    api.getUser(id)
      .then(function (user) {
        done(null, user);
      })
      .catch(function (err) {
        done(err);
      });
  });
  pp.use(new LocalStrategy(function (username, password, done) {
    api.searchUser({ username: username }, true)
      .then(function (user) {
        if (user.length !== 1) {
          return done(null, false);
        }
        debug('login', user);
        user = user[0];
        bcrypt.compare(password, user.password, function (err, res) {
          if (err) return done(err);
          delete user.password;
          done(null, user);
        });
      })
      .catch(function (err) {
        done(err);
      });
  }));
};