'use strict'

const PubSub = require('./PubSub')
    , api = require('./api')
    , store = require('./store')
    , pp = require('./passport')
    , config = require('../config')
    , signature = require('cookie-signature')
    , cookieParser = require('cookie-parser')()
    , debug = require('debug')('aocmulti:socket-api')
    , uuid = require('node-uuid')
    , _ = require('lodash')

const pluck = require('propprop')

const Errors = {
  InvalidRoomError: { type: 'error', msg: 'invalid room' }
}

const cookieAuth = function (app) {
  return (sock, next) => {
    const req = sock.request
    // Use our newly obtained request to find our user session
    // (this was just copy-pasted from the `express-session` module)
    cookieParser(req, {}, () => {
      const rawCookie = req.cookies.sid
      const unsignedCookie = (0 == rawCookie.indexOf('s:'))
        ? signature.unsign(rawCookie.slice(2), config.cookie_secret)
        : rawCookie
      app.sessionStore.get(unsignedCookie, (err, session) => {
        if (err) throw err
        if (session != null) {
          sock.session = session
          next()
        }
        else {
          app.sessionStore.generate(req)
          sock.session = req.session
          next()
        }
      })
    })
  }
}

export default function (app, io) {

  const subscribers = x => io.in(`subscription:${x}`)
  const passthruEvents = [ 'gameRoom:created', 'gameRoom:destroyed' ]
  passthruEvents.forEach(event => {
    PubSub.subscribe(event, (...args) => {
      io.emit(event, ...args)
    })
  })

  PubSub.subscribe('gameRoom:playerLeft', (rid, uid) => {
    debug('gameRoom:playerLeft', rid, uid)
    subscribers('gameRoom').emit('gameRoom:playerLeft', rid, uid)
    store.find('user', uid).then(user => {
      io.in(`chat:${rid}`).emit(`chat:message:${rid}`, {
        uid: 0
      , room: rid
      , msg: `${user.username} left the room`
      })
    })
  })
  PubSub.subscribe('gameRoom:playerEntered', (rid, uid) => {
    debug('gameRoom:playerEntered', rid, uid)
    subscribers('gameRoom').emit('gameRoom:playerEntered', rid, uid)
    store.find('user', uid).then(user => {
      io.in(`chat:${rid}`).emit(`chat:message:${rid}`, {
        uid: 0
      , room: rid
      , msg: `${user.username} joined the room`
      })
    })
  })
  PubSub.subscribe('gameRoom:hostChanged', (rid, uid) => {
    debug('gameRoom:hostChanged', rid, uid)
    subscribers('gameRoom').emit('gameRoom:hostChanged', rid, uid)
    store.find('user', uid).then(function (user) {
      io.in(`chat:${rid}`).emit(`chat:message:${rid}`, {
        uid: 0
      , room: rid
      , msg: `${user.username} is now host`
      })
    })
  })
  PubSub.subscribe('onlinePlayers:userJoined', uid => {
    subscribers('onlinePlayers').emit('onlinePlayers:joined', uid)
  })
  PubSub.subscribe('onlinePlayers:userLeft', uid => {
    subscribers('onlinePlayers').emit('onlinePlayers:left', uid)
  })

  PubSub.subscribe('gameRoom:ready', rid => {
    io.in('room:' + rid).emit('game:launching')
  })

  let disconnections = {}

  io.use(cookieAuth(app))

  io.on('connection', sock => {
    const session = sock.session
    let loggedUser
    if (session && session.uid) {
      loggedUser = store.find('user', session.uid)
    }
    else {
      sock.disconnect()
    }

    if (session && disconnections[session.uid]) {
      clearTimeout(disconnections[session.uid])
      delete disconnections[session.uid]
    }
    else {
      api.online(session.uid)
    }

    sock.on('subscribe', (channel, cb) => {
      debug('subscribing', channel)
      sock.join(`subscription:${channel}`)
      cb && cb()
    })
    sock.on('unsubscribe', (channel, cb) => {
      debug('unsubscribing', channel)
      sock.leave(`subscription:${channel}`)
      cb && cb()
    })

    // api calls
    sock.on('users:me', cb => {
      cb(null, session.uid)
    })

    // Chat API
    const chatDebug = require('debug')('aocmulti:socket-api:chat')
    const roomValidate = room => room === 'lobby' || /^\d+$/.test(room)
    function chatSubscribe(room, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      chatDebug('subscribing', room)
      sock.join(`chat:${room}`)
      cb(null)
    }
    function chatSend(room, message, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      loggedUser.then(u => {
        chatDebug('sending', room, message)
        io.in(`chat:${room}`).emit(`chat:message:${room}`, {
          rid: room
        , msg: message
        , uid: session.uid
        , username: u.username
        , flagClassName: `flag-icon-${u.country}`
        })
        cb(null)
      })
    }
    function chatUnsubscribe(room, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      chatDebug('unsubscribing', room)
      sock.leave(`chat:${room}`)
      cb(null)
    }
    sock.on('chat:subscribe', chatSubscribe)
    sock.on('chat:send', chatSend)
    sock.on('chat:unsubscribe', chatUnsubscribe)

    // Game API
    sock.on('gameRoom:leave', function (cb) {
      session.rid = null
      api.leaveRoom(session.uid)
        .nodeify(cb)
    })
    sock.on('gameRoom:launch', function (cb) {
      const room = session.rid
      io.in(`room:${room}`).emit(`chat:message:${room}`, {
        rid: room
      , msg: 'Game starting…'
      , uid: 0
      })
      setTimeout(() => {
        api.startGame(room)
          .then(() =>
            store.query('gameSession', { userId: session.uid })
              .tap(debug.bind(null, 'gameSession'))
          )
          .then(_.compose(uuid.unparse, pluck('seskey')))
          .nodeify(cb)
      }, 1000)
    })
    function _gameRoomStarting(rid) {
      if (rid == session.rid) {
        store.query('gameSession', { userId: session.uid }).then(ses => {
          if (ses.status === 'waiting') {
            sock.emit('gameRoom:starting', uuid.unparse(ses.seskey))
          }
        })
      }
    }
    PubSub.subscribe('gameRoom:starting', _gameRoomStarting)

    // debug api calls
    sock.on('debug:cleanup-rooms', api.cleanupRooms)

    // cleanup :D
    sock.on('disconnect', () => {
      PubSub.unsubscribe('gameRoom:starting', _gameRoomStarting)
      disconnections[session.uid] = setTimeout(() => {
        api.leaveRoom(session.uid)
        api.offline(session.uid)
      }, 5000)
    })
  })

}
