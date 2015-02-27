'use strict'

const SqlString = require('mysql/lib/protocol/SqlString')
    , { using, promisifyAll } = require('bluebird')
    , _ = require('lodash')

const config = require('../config')
    , debug = require('debug')('aocmulti:mysql')

export const mysql = require('mysql')

promisifyAll(mysql)
promisifyAll(require('mysql/lib/Connection').prototype)
promisifyAll(require('mysql/lib/Pool').prototype)

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
export const pool = mysql.createPool({
  host: config.db.host
, user: config.db.user
, password: config.db.password
, database: config.db.database
})

export function getConnection() {
  return pool.getConnectionAsync().disposer(
    (conn, promise) => conn.release()
  )
}
export function query(...args) {
  return using(getConnection(),
               conn => conn.queryAsync(...args)).get(0)
}