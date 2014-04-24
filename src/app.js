var fs = require('fs'),
    path = require('path');

var Handlebars = require('handlebars');

// Web site stuff
var express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    csurf = require('csurf'),
    logger = require('morgan');

var config = require('./config');

// App setup
var app = express();
app.use(logger());
app.use(cookieParser());
app.use(session({ secret: config.cookie_secret, key: 'sid' }));
app.use(bodyParser());
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

module.exports = app;