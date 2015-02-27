'use strict'

const api = require('../api')
    , store = require('../store')
    , debug = require('debug')('aocmulti:web-api')
    , express = require('express')
    , _ = require('lodash')

const { singleton, renameProp } = require('../fn')
const pluck = require('propprop')
const { map } = require('lambdajs')
const assign = require('object-assign')
const curry = require('curry')

const splitInto = functions => {
  return (...args) => functions.map(fn => fn(...args))
}

const await = curry((then, promise) => promise.then(then))

const cleanModRecord = renameProp('userId', 'author')

const sendError = (code, msg, res) => {
  return err => {
    res.writeHead(code, { 'Content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error: err, msg: msg }))
  }
}
const sendResponse = res => {
  return obj => {
    res.writeHead(200, { 'Content-type': 'application/json' })
    res.end(JSON.stringify(obj, null, '  '))
  }
}

export default function () {

  let app = express.Router()

  app.use('/rooms', require('./api/rooms')())
  app.use('/users', require('./api/users')())

  app.get('/mods/:mod_id', (req, res) => {
    store.find('mod', req.params.mod_id)
      .then(cleanModRecord)
      .then(singleton('mod'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find mod', res))
  })
  app.get('/mods', (req, res) => {
    store.findAll('mod')
      .then(map(cleanModRecord))
      // create two objects, {mods} and {users}
      .then(splitInto([
        singleton('mods')
      , _.compose(await(singleton('users')), store.findMany('user'), map(pluck('author')))
      ]))
      // merge into {mods,users}
      .spread(assign)
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find mods', res))
  })

  return app

}
