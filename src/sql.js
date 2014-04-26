var mysql = require('mysql'),
    when = require('when');

var config = require('./config'),
    debug = require('debug')('mysql');

// MySQL & helpers
var pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});
function query(conn, sql) {
  var args = [].slice.call(arguments, 1);
  return when.promise(function (resolve, reject, notify) {
    args.push(function (err, rows) {
      debug('finished query', sql);
      if (err) reject(err);
      else resolve(rows);
    });
    debug('starting query', sql);
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
