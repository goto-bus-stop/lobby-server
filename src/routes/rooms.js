import { Router } from 'express'
import uuid from 'node-uuid'
import db from '../knex'
import util from './util'
import { compose, curry, renameProp, filter, intoObj } from '../fn'

const debug = require('debug')('aocmulti:api:rooms')

const createSessionRecord = curry((roomId, playerId) => {
  return { seskey: uuid.v4({}, Buffer(16)), roomId, userId: playerId }
})

const gameRoomColumns = [ 'id', 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId', 'status' ]

export default let app = Router()

app.get('/:game_id', function (req, res) {
  const id = req.params.game_id

  db('gameRooms').column(gameRoomColumns).where('id', id).first()
    .then(renameProp('hostId', 'host'))
    .then(intoObj('room'))
    .then(util.sideloadPlayers)

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find game', res))
})

app.get('/', function (req, res) {
  db('gameRooms').select(gameRoomColumns)
    .then(intoObj('rooms'))
    .then(util.sideloadPlayers)

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find games', res))
})

app.post('/:game_id/start', function (req, res) {
  const id = req.params.game_id
  const myId = req.session.uid
  // set room to playing
  db('gameRooms').where('id', id).update({ status: 'playing' })
    // get players
    .then(room => db('user').where('roomId', room.id))
    // create player sessions
    .map(compose(createSessionRecord(id), pluck('id')))
    // store player sessions
    .then(sessions => Promise.all([
      db('gameSession').insert(sessions)
    , sessions.filter(session => session.userId === myId)[0]
    ]))
    // get host seskey
    .spread((ins, { seskey }) => uuid.unparse(seskey))

    .then(util.sendResponse(res))
    .catch(util.sendError(500, 'Could not start game', res))
})

app.post('/', function (req, res) {
  const room = req.body.room
  const options = {
    title: room.title
  , descr: room.desc
  , maxPlayers: room.maxPlayers
  , ladderId: room.ladderId
  , hostId: req.session.uid
  , ip: req.ip
  }
  api.createGame(options)
    .then(intoObj('room'))

    .then(util.sendResponse(res))
    .catch(util.sendError(500, 'Could not host game room', res))
})

app.post('/:room_id/join', function (req, res) {
  let roomId = toInt(req.params.room_id)
  db('users').where('id', req.session.uid).pluck('roomId').first()
    .tap(rid => { /* if (rid) { leave room } */ })
    .tap(() => { db('users').where('id', req.session.uid).update({ roomId }) })
    .return(true)

    .then(util.sendResponse(res))
    .catch(util.sendError(500, 'Could not join room', res))
})

app.post('/:game_id/leave', function (req, res) {

})