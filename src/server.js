const debug = require('debug')('server');

// require() debug
var _r = require;
require = function (path) {
  debug('require', path);
  return _r(path);
};

debug('starting');

const http = require('http'),
      path = require('path'),
      fs = require('fs');

// Web site stuff
const express = require('express'),
      cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser'),
      session = require('express-session'),
      csurf = require('csurf'),
      logger = require('morgan'),
      lessMiddleware = require('less-middleware'),
      pp = require('passport');

// Library stuff
const when = require('when'),
      sequence = require('when/sequence');
const _ = require('lodash');
const socketio = require('socket.io');

const sql = require('./sql');
const api = require('./api');
const config = require('./config');

// set up Handlebars helpers
const Handlebars = require('handlebars');
require('./handlebars-helpers')(Handlebars);

require('./passport')(pp);

// App setup
const app = express();

app.disable('x-powered-by');

if (config.env === 'production') {
  const RedisStore = require('connect-redis')(session);
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

// View stuff
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

const server = http.createServer(app);
app.io = socketio(server);

require('./socket-api')(app);

server.listen(config.port, function () {
  console.log('Listening on port %d', server.address().port);
});

const User = require('./models/User');
User.create({ id: 0 });

setInterval(function () {
  debug('memusage: ' + JSON.stringify(process.memoryUsage()));
}, 30000);