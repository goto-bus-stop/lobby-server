var debug = require('debug')('server');

var _r = require;
require = function (path) {
  debug('require', path);
  return _r(path);
};

debug('starting');

var http = require('http'),
    path = require('path'),
    fs = require('fs');

// Web site stuff
var express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    csurf = require('csurf'),
    logger = require('morgan'),
    lessMiddleware = require('less-middleware'),
    pp = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    bcrypt = require('bcrypt');

// Library stuff
var when = require('when'),
    sequence = require('when/sequence');
var _ = require('lodash');
var socketio = require('socket.io');

var sql = require('./sql');
var api = require('./api');
var config = require('./config');

// set up Handlebars helpers
var Handlebars = require('handlebars');
require('./handlebars-helpers')(Handlebars);


pp.serializeUser(function(user, done) {
  done(null, user.id);
});

pp.deserializeUser(function(id, done) {
  api.getUser(id)
    .then(function (user) {
      done(null, user);
    })
    .catch(function (err) { done(err); });
});
pp.use(new LocalStrategy(function (username, password, done) {
  api.searchUser({ username: username }, true)
    .then(function (user) {
      if (user.length !== 1) {
        return done(null, false);
      }
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

// App setup
var app = express();

app.disable('x-powered-by');

if (config.env === 'production') {
//  var RedisStore = ('connect-redis')(session);
  app.sessionStore = new RedisStore(config.redis);
}
else {
  app.sessionStore = new session.MemoryStore();
}

app.passport = pp;

//app.use(logger());
app.use(cookieParser());
app.use(bodyParser());
app.use(session({ secret: config.cookie_secret, key: 'sid', store: app.sessionStore }));
app.use(pp.initialize());
app.use(pp.session());
app.use(lessMiddleware(__dirname + '/public', { debug: config.env === 'development' }));
app.use(express.static(__dirname + '/public'));

Handlebars.registerHelper('template', function (n) {
  return fs.readFileSync(path.join(__dirname, 'templates', n + '.handlebars'), { encoding: 'utf8' });
});
app.engine('handlebars', function (view, options, callback) {
  fs.readFile(view, { encoding: 'utf8' }, function (err, hbs) {
    if (err) return callback(err);
    callback(null, Handlebars.compile(hbs)(options));
  });
});
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));
app.locals.config = config;

require('./routes/index')(app);

// Web App API
app.use('/api', require('./routes/web-api')(express.Router()));
// Client API
app.use('/_CLIENT', require('./routes/client-api')(express.Router()));

var server = http.createServer(app);

app.io = socketio.listen(server);

require('./socket-api')(app);

server.listen(config.port, function () {
  console.log('Listening on port %d', server.address().port);
});