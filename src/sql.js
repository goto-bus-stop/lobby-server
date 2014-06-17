var mysql = require('mysql'),
    SqlString = require('mysql/lib/protocol/SqlString'),
    when = require('when'),
    _ = require('lodash');

var config = require('./config'),
    debug = require('debug')('mysql');

// patch SqlString to do format arrays in objects with IN()
SqlString.objectToValues = function(object, timeZone) {
  var values = [];
  for (var key in object) {
    var value = object[key];
    if(typeof value === 'function') {
      continue;
    }

    if (Array.isArray(value)) {
      values.push(this.escapeId(key) + ' IN(' + SqlString.arrayToList(value, timeZone) + ')');
    }
    else {
      values.push(this.escapeId(key) + ' = ' + SqlString.escape(value, true, timeZone));
    }
  }

  return values.join(', ');
};

// MySQL & helpers
var pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});
function query(conn, sql) {
  var args = [].slice.call(arguments, 1);
  
  if (typeof conn === 'string') {
    var _conn;
    args.unshift(conn);
    return getConnection().then(function (conn) {
      _conn = conn;
      return query.apply(null, [ conn ].concat(args));
    }).finally(function () {
      _conn.release();
    });
  }
  
  var formattedSql = mysql.format.apply(mysql, args);
  return when.promise(function (resolve, reject, notify) {
    args.push(function (err, rows) {
      debug('finished query', formattedSql);
      if (err) reject(err);
      else resolve(rows);
    });
    debug('starting query', formattedSql);
    conn.query.apply(conn, args);
  });
}
function getConnection() {
  return when.promise(function (resolve, reject, notify) {
    pool.getConnection(function (err, conn) {
      debug('got connection');
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

exports.query = query;
exports.getConnection = getConnection;
exports.pool = pool;
exports.mysql = mysql;
exports.prefixKeys = function prefixKeys(obj, prefix) {
  if (prefix) {
    prefix += '.';
  }
  else {
    prefix = '';
  }
  var prefixed = {};
  _.forOwn(obj, function (val, key) {
    prefixed[prefix + key] = val;
  });
  return prefixed;
};