'use strict'

const _ = require('lodash')
    , sql = require('./sql')
    , PubSub = require('./PubSub')
    , Promise = require('bluebird')
    , debug = require('debug')('aocmulti:api')
    , store = require('./store')
    , uuid = require('node-uuid')

const { without, subset } = require('./fn')
const pluck = require('propprop')
const { map } = require('lambdajs')
const curry = require('curry')

//+ writeDebugMessage :: Error -> IO
const writeDebugMessage = _.compose(console.error.bind(console), pluck('stack'))

const cleanRatingRecord = _.compose(without('userId'), without('rating'))
export function addRatings(user) {
  debug('addRatings', user)
  user.ratings = {}
  return store.queryMany('rating', { userId: user.id })
    .tap(debug)
    .each(function (rating) {
      user.ratings[rating.ladderId] = cleanRatingRecord(rating)
    })
    .return(user)
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
    .each(function (rating) {
      usersMap[rating.userId].ratings[rating.ladderId] = cleanRatingRecord(rating)
    })
    .return(users)
    .catch(writeDebugMessage)
}

export function createGame(options) {
  // options { title, descr, maxPlayers, ladderId, hostId }
  return store.insert('gameRoom', subset([ 'title', 'descr', 'maxPlayers', 'ladderId', 'hostId' ], options))
    .tap(x => { PubSub.publish('gameRoom:created', x) })
    .catch(writeDebugMessage)
}

const createSessionRecord = curry(function (roomId, playerId) {
  return { seskey: uuid.v4({}, Buffer(16)), roomId: roomId, userId: playerId }
})
export function startGame(id) {
  return Promise.all([
    store.update('gameRoom', { id: id }, { status: 'playing' }),
    store.queryMany('user', { roomId: id })
  ])
  .tap(debug.bind(null, `players in ${id}`))
  .get(1)
  .then(players => {
    const sessions = players.map(_.compose(createSessionRecord(id), pluck('id')))
    return store.insertMany('gameSession', sessions)
      .return(sessions)
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
    .then(u => {
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
    .then(user => {
      if (user.roomId != null && user.roomId != rid) {
        PubSub.publish('gameRoom:playerLeft', user.roomId, uid)
      }
      else if (user.roomId != rid) {
        return store.update('user', { id: uid }, { roomId: rid })
          .tap(() => { PubSub.publish('gameRoom:playerEntered', rid, uid) })
      }
    })
    .tap(() => { setTimeout(cleanupRooms, 0) })
    .return(true)
    .catch(writeDebugMessage)
}
export function leaveRoom(uid) {
  let rid
  debug('user leaving room', 'userid:', uid)
  return store.find('user', uid, [ 'roomId' ])
    .tap(user => {
      if (user.roomId != null) {
        rid = user.roomId
        debug('user leaving room', 'roomid:', rid)
        PubSub.publish('gameRoom:playerLeft', user.roomId, uid)
        return store.update('user', { id: uid }, { roomId: null })
      }
    })
    .then(() => store.find('gameRoom', rid, [ 'hostId' ]))
    .tap(hostId => {
      if (hostId && hostId.hostId == uid) {
        return store.query('user', { roomId: rid }, [ 'id' ])
          .then(host => {
            return store.update('gameRoom', { id: rid }, { hostId: host.id })
              .tap(() => { PubSub.publish('gameRoom:hostChanged', rid, host.id) })
          })
      }
    })
    .return(true)
    .catch(writeDebugMessage)
    .finally(cleanupRooms)
}

export function online(uid) {
  return store.queryMany('webSession', { userId: uid })
    .then(res => {
      if (res.length === 0) {
        PubSub.publish('onlinePlayers:userJoined', uid)
        return store.insert('webSession', { userId: uid, serverId: 1 })
      }
    })
}
export function offline(uid) {
  return store.query('webSession', { userId: uid }, [ 'id' ])
    .get('id')
    .then(store.destroy('webSession'))
    .tap(() => { PubSub.publish('onlinePlayers:userLeft', uid) })
}
export function getOnlineUsers(sid) {
  return sql.query('SELECT u.* FROM users u, webSessions o WHERE u.id = o.userId AND o.serverId = ?', [ sid ])
    .catch(writeDebugMessage)
}