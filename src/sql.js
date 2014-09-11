'use strict'

const mysql = require('mysql')
    , SqlString = require('mysql/lib/protocol/SqlString')
    , Promise = require('./promise')
    , _ = require('lodash')

const config = require('../config')
    , debug = require('debug')('aocmulti:mysql')

// patch SqlString to do format arrays in objects with IN()
SqlString.objectToValues = function (object, timeZone, sep) {
  if (!sep) sep = ', '
  
  var values = []
    , key
    , value
  for (key in object) {
    value = object[key]
    if (typeof value === 'function') {
      continue
    }

    if (Array.isArray(value)) {
      values.push(SqlString.escapeId(key) + ' IN(' + SqlString.arrayToList(value, timeZone) + ')')
    }
    else {
      values.push(SqlString.escapeId(key) + ' = ' + SqlString.escape(value, true, timeZone))
    }
  }

  return values.join(sep)
}

// MySQL & helpers
const pool = mysql.createPool({
  host: config.db.host
, user: config.db.user
, password: config.db.password
, database: config.db.database
})

var $queryId = 0
function query(conn, sql) {
  var args = [].slice.call(arguments, 1);
  
  if (typeof conn === 'string') {
    let _conn
    args.unshift(conn)
    return getConnection().then(function (conn) {
      _conn = conn
      return query.apply(null, [ conn ].concat(args))
    }).finally(function () {
      _conn && _conn.release()
    })
  }
  
  var formattedSql = mysql.format.apply(mysql, args);
  return new Promise(function (resolve, reject) {
    const queryId = ++$queryId
    args.push(function (err, rows) {
      debug('finished query #' + queryId)
      debug('err', err)
      if (err) reject(err)
      else resolve(rows)
    })
    debug('starting query #' + queryId, formattedSql)
    conn.query.apply(conn, args)
  })
}
function getConnection() {
  return new Promise(function (resolve, reject) {
    pool.getConnection(function (err, conn) {
      debug('got connection')
      if (err) reject(err)
      else resolve(conn)
    })
  })
}

exports.query = query
exports.getConnection = getConnection
exports.pool = pool
exports.mysql = mysql;
exports.prefixKeys = function prefixKeys(obj, prefix) {
  if (prefix) {
    prefix += '.'
  }
  else {
    prefix = ''
  }
  var prefixed = {}
  _.forOwn(obj, function (val, key) {
    prefixed[prefix + key] = val
  })
  return prefixed
}