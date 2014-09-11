'use strict'

const _ = require('lodash')
    , sql = require('./sql')
    , PubSub = require('./PubSub')
    , Promise = require('./promise')
    , debug = require('debug')('aocmulti:api')
    , store = require('./store')
    , uuid = require('node-uuid')

//+ writeDebugMessage :: Error -> IO
const writeDebugMessage = compose(console.error.bind(console), pluck('stack'))

const addPlayers = function (room) {
  return store.queryMany('user', { roomId: room.id }, [ 'id' ])
    .then(map(pluck('id')))
    .then(compose(merge(room), singleton('players')))
}
const addPlayersA = function (rooms) {
  if (!rooms || rooms.length === 0) return rooms
  let roomsMap = _.indexBy(rooms, 'id')
  return store.queryMany('user', { roomId: map(pluck('id'), rooms) })
    .then(forEach(function (user) {
      const thisRoom = roomsMap[user.roomId]
      thisRoom.players = (thisRoom.players || []).concat([ user.id ])
    }))
    .then(constant(rooms))
    .catch(writeDebugMessage)
}

const cleanRatingRecord = compose(without('userId'), without('rating'))
const addRatings = function (user) {
  debug('addRatings', user)
  user.ratings = {}
  return store.queryMany('rating', { userId: user.id })
    .then(isolate(debug))
    .then(forEach(function (rating) {
      user.ratings[rating.ladderId] = cleanRatingRecord(rating)
    }))
    .then(constant(user))
    .catch(writeDebugMessage)
}
const addRatingsA = function (users) {
  if (!users || users.length === 0) return users
  debug('addRatingsA', users.length)
  let usersMap = {}
    , userIds = []
  users.forEach(function (user) {
    usersMap[user.id] = user
    userIds.push(user.id)
    user.ratings = {}
  })
  return store.queryMany('rating', { userId: userIds })
    .then(forEach(function (rating) {
      usersMap[rating.userId].ratings[rating.ladderId] = cleanRatingRecord(rating)
    }))
    .then(constant(users))
    .catch(writeDebugMessage)
}

const createGame = function (options) {
  // options { title, descr, maxPlayers, ladderId, hostId }
  return store.insert('gameRoom', subset([ 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId' ], options))
    .then(function (q) {
      PubSub.publish('gameRoom:created', merge(options, { id: q.insertId }))
      return q.insertId
    })
    .catch(writeDebugMessage)
}

const randOf = function (arr) { return arr[ Math.floor(Math.random() * arr.length) ] }
const pad = function (l, x) { while (x.length < l) x += '0'; return x }
const arrayOf10 = [ 0, 0, 0, 0, 0
                  , 0, 0, 0, 0, 0 ]
const createSessionRecord = curry(function (roomId, playerId) { return { seskey: uuid.v4({}, new Buffer(16)), roomId: roomId, userId: playerId } })
const startGame = function (id) {
  let hostSession
  return Promise.all([
    store.update('gameRoom', { id: id }, { status: 'playing' }),
    store.queryMany('user', { roomId: id })
  ])
  .then(pluck(1))
  .then(function (players) {
    const sessions = map(compose(createSessionRecord(id), pluck('id')), players)
    hostSession = sessions[0]
    return store.insertMany('gameSession', sessions)
  })
  .catch(writeDebugMessage)
}
const cleanupRooms = function () {
  return sql.query('SELECT id ' +
                   'FROM gameRooms ' +
                   'WHERE id NOT IN(' +
                     'SELECT DISTINCT roomId ' +
                     'FROM users ' +
                     'WHERE roomId IS NOT NULL' +
                   ')')
    .then(function (u) {
      const rids = map(pluck('id'), u)
      if (rids.length > 0) {
        debug('destroying', rids)
        PubSub.publish('gameRoom:destroyed', rids)
        return store.destroyMany('gameRoom', rids)
      }
    })
}
const joinRoom = function (uid, rid) {
  return store.find('user', uid, [ 'roomId' ])
    .then(function (user) {
      if (user.roomId != null && user.roomId != rid) {
        PubSub.publish('gameRoom:playerLeft', user.roomId, uid)
      }
      else if (user.roomId != rid) {
        return store.update('user', { id: uid }, { roomId: rid }).then(function () {
          PubSub.publish('gameRoom:playerEntered', rid, uid)
        })
      }
    })
    .then(function () { setTimeout(cleanupRooms, 0) })
    .then(constant(true))
    .catch(writeDebugMessage)
}
const leaveRoom = function (uid) {
  let rid
  debug('user leaving room', 'userid:', uid)
  return store.find('user', uid, [ 'roomId' ])
    .then(function (user) {
      if (user.roomId != null) {
        rid = user.roomId
        debug('user leaving room', 'roomid:', rid)
        PubSub.publish('gameRoom:playerLeft', user.roomId, uid)
        return store.update('user', { id: uid }, { roomId: null })
      }
    })
    .then(function () {
      return store.find('gameRoom', rid, [ 'hostId' ])
    })
    .then(function (hostId) {
      if (hostId && hostId.hostId == uid) {
        return store.query('user', { roomId: rid }, [ 'id' ])
          .then(function (host) {
            return store.update('gameRoom', { id: rid }, { hostId: host.id })
              .then(function () {
                PubSub.publish('gameRoom:hostChanged', rid, host.id)
              })
          })
      }
    })
    .then(constant(true))
    .catch(writeDebugMessage)
    .finally(cleanupRooms)
}

const online = function (uid) {
  return store.queryMany('webSession', { userId: uid })
    .then(function (res) {
      if (res.length === 0) {
        PubSub.publish('onlinePlayers:userJoined', uid)
        return store.insert('webSession', { userId: uid, serverId: 1 })
      }
    })
}
const offline = function (uid) {
  return store.query('webSession', { userId: uid }, [ 'id' ])
    .then(pluck('id'))
    .then(store.destroy('webSession'))
    .then(function () { PubSub.publish('onlinePlayers:userLeft', uid) })
}
const getOnlineUsers = function (sid) {
  return sql.query('SELECT u.* FROM users u, webSessions o WHERE u.id = o.userId AND o.serverId = ?', [ sid ])
    .catch(writeDebugMessage)
}

exports.createGame = createGame
exports.startGame = startGame
exports.joinRoom = joinRoom
exports.leaveRoom = leaveRoom
exports.cleanupRooms = cleanupRooms

exports.online = online
exports.offline = offline
exports.getOnlineUsers = getOnlineUsers

exports.addRatings = addRatings
exports.addRatingsA = addRatingsA
exports.addPlayers = addPlayers
exports.addPlayersA = addPlayersA
