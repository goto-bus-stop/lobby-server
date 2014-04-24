var mysql = require('mysql'),
    when = require('when');

var config = require('./config');

// MySQL & helpers
var pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});
function query(conn, sql) {
  var args = [].slice.call(arguments, 1),
      timer = 'Query `' + sql + '`';
  return when.promise(function (resolve, reject, notify) {
    args.push(function (err, rows) {
      console.timeEnd(timer);
      if (err) reject(err);
      else resolve(rows);
    });
    console.time(timer);
    conn.query.apply(conn, args);
  });
}
function getConnection() {
  return when.promise(function (resolve, reject, notify) {
    pool.getConnection(function (err, conn) {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

exports.query = query;
exports.getConnection = getConnection;
exports.pool = pool;
exports.mysql = mysql;
