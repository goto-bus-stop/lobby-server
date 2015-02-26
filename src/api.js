'use strict'

const _ = require('lodash')
    , sql = require('./sql')
    , PubSub = require('./PubSub')
    , Promise = require('./promise')
    , debug = require('debug')('aocmulti:api')
    , store = require('./store')
    , uuid = require('node-uuid')

const { pluck, without, isolate, constant, subset } = require('./fn')
const { compose, forEach, map } = require('lambdajs')
const curry = require('curry')

//+ writeDebugMessage :: Error -> IO
const writeDebugMessage = compose(console.error.bind(console), pluck('stack'))

const cleanRatingRecord = compose(without('userId'), without('rating'))
export function addRatings(user) {
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
export function addRatingsA(users) {
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

export function createGame(options) {
  // options { title, descr, maxPlayers, ladderId, hostId }
  return store.insert('gameRoom', subset([ 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId' ], options))
    .then(isolate(x => { PubSub.publish('gameRoom:created', x) }))
    .catch(writeDebugMessage)
}

const createSessionRecord = curry(function (roomId, playerId) {
  return { seskey: uuid.v4({}, Buffer(16)), roomId: roomId, userId: playerId }
})
export function startGame(id) {
  let hostSession
  return Promise.all([
    store.update('gameRoom', { id: id }, { status: 'playing' }),
    store.queryMany('user', { roomId: id })
  ])
  .then(isolate(debug.bind(null, 'players in ' + id)))
  .then(pluck(1))
  .then(function (players) {
    const sessions = map(compose(createSessionRecord(id), pluck('id')), players)
    return store.insertMany('gameSession', sessions)
      .then(constant(sessions))
  })
  .catch(writeDebugMessage)
}
export function cleanupRooms() {
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
export function joinRoom(uid, rid) {
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
export function leaveRoom(uid) {
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

export function online(uid) {
  return store.queryMany('webSession', { userId: uid })
    .then(function (res) {
      if (res.length === 0) {
        PubSub.publish('onlinePlayers:userJoined', uid)
        return store.insert('webSession', { userId: uid, serverId: 1 })
      }
    })
}
export function offline(uid) {
  return store.query('webSession', { userId: uid }, [ 'id' ])
    .then(pluck('id'))
    .then(store.destroy('webSession'))
    .then(function () { PubSub.publish('onlinePlayers:userLeft', uid) })
}
export function getOnlineUsers(sid) {
  return sql.query('SELECT u.* FROM users u, webSessions o WHERE u.id = o.userId AND o.serverId = ?', [ sid ])
    .catch(writeDebugMessage)
}