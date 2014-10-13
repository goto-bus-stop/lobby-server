'use strict';

const api = require('../api')
    , store = require('../store')
    , debug = require('debug')('aocmulti:web-api')
    , express = require('express')
    , Promise = require('../promise')
    , uuid = require('node-uuid')
    , _ = require('lodash')

const gameRoomColumns = [ 'id', 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId', 'status' ]
    , userColumns = [ 'id', 'username', 'country', 'status', 'roomId' ]

const createSessionRecord = curry(function (roomId, playerId) {
  return { seskey: uuid.v4({}, new Buffer(16)), roomId: roomId, userId: playerId }
})

const splitInto = curry(function (functions, _arg) {
  var args = [].slice.call(arguments, 1)
  return Promise.all(functions.map(function (fn) {
    return fn.apply(null, args)
  }))
})

const cleanUserRecord = subset(userColumns)
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

  app.get('/rooms', function (req, res) {
    store.findAll('gameRoom', gameRoomColumns)
      .then(singleton('rooms'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find games', res))
  })
  app.get('/rooms/:game_id', function (req, res) {
    const id = req.params.game_id

    store.find('gameRoom', id, gameRoomColumns)
      .then(singleton('room'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find game', res))
  })
  app.post('/rooms/:game_id/start', function (req, res) {
    const id = req.params.game_id
    // set room to playing
    store.update('gameRoom', { id: id }, { status: 'playing' })
      // get players
      .then(function () { return store.queryMany('user', { roomId: id }) })
      // create player sessions
      .then(map(function (player) { return createSessionRecord(id, player.id) }))
      // store player sessions
      .then(store.insertMany('session'))
      .then(function () { PubSub.publish('game:start', id) })
      .then(sendResponse(res))
      .catch(sendError(500, 'Could not start game', res))
  })
  app.post('/rooms', function (req, res) {
    const room = req.body.room
    const options = {
      title: room.title,
      descr: room.desc,
      maxPlayers: room.maxPlayers,
      ladderId: room.ladder,
      hostId: req.session.uid,
      ip: req.ip
    }
    api.createGame(options)
      .then(function (result) { return api.joinRoom(req.session.uid, result).then({ room: result }) })
      .then(sendResponse(res))
      .catch(sendError(500, 'Could not host game room', res))
  })
  app.post('/rooms/:game_id/join', function (req, res) {
    store.find('user', req.session.uid)
      .then(pluck('roomId'))
      .then(function (rid) {
        if (rid) {
          PubSub.publish('gameRoom:playerLeft', rid, req.session.uid)
        }
      })
      .then(function () {
        return store.update('user', { id: req.session.uid }, { roomId: req.params.game_id })
      })
      .then(function () {
        PubSub.publish('gameRoom:playerEntered', req.params.game_id, req.session.uid)
        return true
      })
      .then(sendResponse(res))
      .catch(sendError(500, 'Could not join room', res))

  })
  app.post('/rooms/:game_id/leave', function (req, res) {
    
  })

  app.get('/users/:user_id/ratings', function (req, res) {
    store.queryMany('rating', { userId: req.params.user_id })
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find ratings', res))
  })
  app.get('/users/online', function (req, res) {
    api.getOnlineUsers(1)
      .then(map(cleanUserRecord))
      .then(api.addRatingsA)
      .then(singleton('users'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find users', res))
  })
  app.get('/users/:user_id', function (req, res) {
    const id = req.params.user_id

    store.find('user', id)
      .then(cleanUserRecord)
      .then(api.addRatings)
      .then(singleton('user'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find user', res))
  })
  app.get('/users', function (req, res) {
    const query = req.query
    let find
    if (!_.isEmpty(query)) {
      if (Object.keys(query).length === 1 && 'online' in query) {
        find = api.getOnlineUsers(1)
      }
      else {
        find = store.queryMany('user', query)
      }
    }
    else {
      find = store.findAll('user')
    }
    find
      .then(map(cleanUserRecord))
      .then(api.addRatingsA)
      .then(singleton('users'))
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find users', res))
  })

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
      .then(splitInto([
        singleton('mods')
      , compose(map(singleton('users')), store.findMany('user'), map(pluck('author')))
      ]))
      .spread(merge)
      .then(sendResponse(res))
      .catch(sendError(404, 'Could not find mods', res))
  })
  
  return app

}
