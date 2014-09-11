'use strict';

const api = require('../api')
    , store = require('../store')
    , express = require('express')

const generateSeskey = function () {
  const chars = '1234567890abcdef'
  const randOf = function (arr) { return arr[ Math.floor(Math.random() * arr.length) ] }
  const pad = function (l, x) { return x.length < l ? pad(l - 1, x + '0') : x }
  return pad(13, _.now().toString(16)) + map(function () { return randOf(arr) }, Array(10)).join('')
}

const cleanUserRecord = subset([ 'id', 'username', 'country', 'status', 'roomId' ])

const error = function (msg, res) {
  return function (err) {
    res.writeHead(404, { 'Content-type': 'application/json' })
    res.json({ type: 'error', error: err, msg: msg })
  }
}

function SessDesc(seskey, rid, uid) {
  this.seskey = seskey
  this.roomId = rid
  this.userId = uid
}

module.exports = function () {

  let app = express.Router()
  
  app.get('/games', function (req, res) {
    store.findAll('gameRoom')
      .then(res.json)
      .catch(error('Could not find games', res))
  })
  app.get('/game/:game_id', function (req, res) {
    const id = req.params.game_id

    store.find('gameRoom', id)
      .then(res.json)
      .catch(error('Could not find game', res))
  })

  app.post('/games/:game_id/start', function (req, res) {
    const id = req.params.game_id
    // set room to playing
    store.update('gameRoom', { id: id }, { status: 'playing' })
      // get players
      .then(function () { return store.queryMany('user', { roomId: id }) })
      // create player sessions
      .then(map(function (player) { return new SessDesc(generateSesKey(), id, player.id) }))
      // store player sessions
      .then(sql.insertMany('session'))
      .then(function () { PubSub.publish('game:start', id) })
      .then(res.json)
      .catch(error('Could not start game', res))
  })
  
  app.post('/games', function (req, res) {
    const options = {
      title: req.body.title,
      descr: req.body.desc,
      maxPlayers: req.body.maxPlayers,
      ladderId: req.body.ladder,
      hostId: req.session.uid,
      ip: req.ip
    }
    api.createGame(options)
      .then(function (result) { return api.joinRoom(req.session.uid, result).then(constant(result)) })
      .then(res.json)
      .catch(error('Could not host game room', res))
  })
  
  app.post('/games/:game_id/join', function (req, res) {
    store.find('user', req.session.uid)
      .then(pluck('roomId'))
      .then(function (rid) {
        if (rid) PubSub.publish('gameRoom:playerLeft', rid, req.session.uid)
      })
      .then(function () {
        return store.update('user', { id: req.session.uid }, { roomId: req.params.game_id })
      })
      .then(function () {
        PubSub.publish('gameRoom:playerEntered', req.params.game_id, req.session.uid)
      })
      .then(partial(res.json, { type: 'success' }))
      .catch(error('Could not join room', res))

  })
  app.post('/games/:game_id/leave', function (req, res) {
  })
  app.get('/users/:user_id/ratings', function (req, res) {
    store.queryMany('rating', { userId: req.params.user_id })
      .then(res.json)
      .catch(error('Could not find ratings', res))
  })
  
  app.get('/user/:user_id', function (req, res) {
    const id = req.params.user_id

    store.find('user', id)
      .then(cleanUserRecord)
      .then(api.addRatings)
      .then(res.json)
      .catch(error('Could not find user', res))
  })
  app.get('/users', function (req, res) {
    const query = req.query

    store.queryMany('user', query)
      .then(map(cleanUserRecord))
      .then(api.addRatingsA)
      .then(res.json)
      .catch(error('Could not find users', res))
  })
  
  return app

}
