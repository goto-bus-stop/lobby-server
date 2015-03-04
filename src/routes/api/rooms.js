'use strict'

const express = require('express')
    , uuid = require('node-uuid')
    , PubSub = require('../../PubSub')
    , store = require('../../store')
    , api = require('../../api')
    , util = require('./util')
    , debug = require('debug')('aocmulti:api:rooms')
    , _ = require('lodash')

const curry = require('curry')
const pluck = require('propprop')
const { renameProp, singleton, toInt, splitInto } = require('../../fn')
const { map, filter } = require('lambdajs')

const createSessionRecord = curry(function (roomId, playerId) {
  return { seskey: uuid.v4({}, new Buffer(16)), roomId: roomId, userId: playerId }
})

const gameRoomColumns = [ 'id', 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId', 'status' ]
const cleanRoomRecord = _.compose(renameProp('hostId', 'host'),
                                  renameProp('ladderId', 'ladder'))

export default function () {

  let app = express.Router()

  app.get('/:game_id', function (req, res) {
    const id = req.params.game_id

    store.find('gameRoom', id, gameRoomColumns)
      .then(renameProp('hostId', 'host'))
      .then(singleton('room'))
      .then(util.sideloadPlayers)
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find game', res))
  })
  app.get('/', function (req, res) {
    store.findAll('gameRoom', gameRoomColumns)
      .then(singleton('rooms'))
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find games', res))
  })
  app.post('/:game_id/start', function (req, res) {
    const id = req.params.game_id
    const myId = req.session.uid
    // set room to playing
    store.update('gameRoom', { id: id }, { status: 'playing' })
      // get players
      .then(_.compose(store.queryMany('user'), singleton('roomId')))
      // create player sessions
      .map(_.compose(createSessionRecord(id), pluck('id')))
      // store player sessions
      .then(splitInto([
        store.insertMany('gameSession'),
        _.compose(pluck(0), filter(session => session.userId === myId))
      ]))
      .spread((ins, mySession) => uuid.unparse(mySession.seskey))
      .tap(() => { PubSub.publish('game:start', id) })
      .then(util.sendResponse(res))
      .catch(util.sendError(500, 'Could not start game', res))
  })
  app.post('/', function (req, res) {
    const room = req.body.room
    const options = {
      title: room.title,
      descr: room.desc,
      maxPlayers: room.maxPlayers,
      ladderId: room.ladderId,
      hostId: req.session.uid,
      ip: req.ip
    }
    api.createGame(options)
      .then(singleton('room'))
      .then(util.sendResponse(res))
      .catch(util.sendError(500, 'Could not host game room', res))
  })
  app.post('/:room_id/join', function (req, res) {
    var roomId = toInt(req.params.room_id)
    store.find('user', req.session.uid)
      .get('roomId')
      .tap(rid => {
        if (rid) {
          PubSub.publish('gameRoom:playerLeft', rid, req.session.uid)
        }
      })
      .then(() => store.update('user', { id: req.session.uid }, { roomId: roomId }))
      .tap(() => { PubSub.publish('gameRoom:playerEntered', roomId, req.session.uid) })
      .return(true)
      .then(util.sendResponse(res))
      .catch(util.sendError(500, 'Could not join room', res))

  })
  app.post('/:game_id/leave', function (req, res) {
    
  })

  return app

}