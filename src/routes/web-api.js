'use strict'

const api = require('../api')
    , store = require('../store')
    , debug = require('debug')('aocmulti:web-api')
    , express = require('express')
    , _ = require('lodash')

const cleanModRecord = renameProp('userId', 'author')

const sendError = function (code, msg, res) {
  return function (err) {
    res.writeHead(code, { 'Content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error: err, msg: msg }))
  }
}
const sendResponse = function (res) {
  return function (obj) {
    res.writeHead(200, { 'Content-type': 'application/json' })
    res.end(JSON.stringify(obj, null, '  '))
  }
}

module.exports = function () {

  let app = express.Router()

  app.use('/rooms', require('./api/rooms')())
  app.use('/users', require('./api/users')())

  app.get('/mods/:mod_id', function (req, res) {
    store.find('mod', req.params.mod_id)
      .then(cleanModRecord)
      .then(singleton('mod'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find mod', res))
  })
  app.get('/mods', function (req, res) {
    store.findAll('mod')
      .then(map(cleanModRecord))
      .thenSplit([
        singleton('mods')
      , compose(map(singleton('users')), store.findMany('user'), map(pluck('author')))
      ])
      .thenCombine(merge)
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find mods', res))
  })
  
  return app

}
