'use strict'

const sql = require('./sql')
    , SqlString = require('mysql/lib/protocol/SqlString')
    , debug = require('debug')('aocmulti:mysql-store')
    , _ = require('lodash')

const { append, values } = require('./fn')
const pluck = require('propprop')
const curry = require('curry')

const fields = (args, ct) => args.length === ct ? args[ct - 1].join(', ') : '*'
const table = append('s')
const pagination = query => {
  if (query.$page) {
    let perPage = query.$perPage || 25
    return ` LIMIT ${perPage} OFFSET ${perPage * (query.$page - 1)}`
  }
  return ''
}
const where = o => SqlString.objectToValues(o, null, ' AND ')
const throwIfEmpty = function (records) {
  if (records.length === 0) {
    throw new Error('not found')
  }
  return records
}

const mysqlStore = function (sql) {
  const st = {
    find: curry(function (type, id) {
      debug('find', type, id)
      return sql.query(`SELECT ${fields(arguments, 3)} FROM ?? WHERE id = ? LIMIT 1`, [ table(type), id ])
        .then(throwIfEmpty)
        .get(0)
    }),
    findMany: curry(function (type, ids) {
      debug('findMany', type, ids)
      return sql.query(`SELECT ${fields(arguments, 3)} FROM ?? WHERE id IN(?)`, [ table(type), ids ])
    }),
    findAll: function (type, since) {
      debug('findAll', type)
      return sql.query(`SELECT ${fields(arguments, 3)} FROM ??`, [ table(type) ])
    },
    query: curry(function (type, query) {
      debug('query', type, query)
      return sql.query(`SELECT ${fields(arguments, 3)} FROM ?? WHERE ${where(query)} LIMIT 1`, [ table(type) ])
        .then(throwIfEmpty)
        .get(0)
    }),
    queryMany: curry(function (type, query) {
      debug('queryMany', type, query)
      return sql.query(`SELECT ${fields(arguments, 3)} FROM ?? WHERE ${where(query)} ${pagination(query)}`, [ table(type) ])
    }),
    update: curry(function (type, query, values) {
      return sql.query(`UPDATE ?? SET ? WHERE ${where(query)}`, [ table(type), values ])
    }),
    insert: curry(function (type, record) {
      return sql.query(`INSERT INTO ?? (??) VALUES (?)`, [ table(type), Object.keys(record), values(record) ])
        .then(x => st.find(type, x.insertId))
    }),
    insertMany: curry(function (type, records) {
      let recKeys = Object.keys(records[0])
        , recValues = records.map(_.compose(sql.mysql.escape, values))
      return sql.query(`INSERT INTO ?? (??) VALUES (${join('), (', recValues)})`, [ table(type), recKeys ])
    }),
    destroy: curry((type, id) => sql.query(`DELETE FROM ?? WHERE id = ?`, [ table(type), id ])),
    destroyMany: curry((type, ids) => sql.query(`DELETE FROM ?? WHERE id IN(?)`, [ table(type), ids ]))
  }
  return st
}

const store = mysqlStore(sql)

store.$connection = sql.pool

export default store