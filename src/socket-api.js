'use strict'

require('./fn').install(global)

const PubSub = require('./PubSub')
    , api = require('./api')
    , store = require('./store')
    , pp = require('./passport')
    , config = require('../config')
    , signature = require('cookie-signature')
    , cookieParser = require('cookie-parser')()
    , debug = require('debug')('aocmulti:socket-api')
    , uuid = require('node-uuid')

const Errors = {
  InvalidRoomError: { type: 'error', msg: 'invalid room' }
}

const cookieAuth = function (app) {
  return function (sock, next) {
    const req = sock.request
    // Use our newly obtained request to find our user session
    // (this was just copy-pasted from the `express-session` module)
    cookieParser(req, {}, function () {
      const rawCookie = req.cookies.sid
      const unsignedCookie = (0 == rawCookie.indexOf('s:'))
        ? signature.unsign(rawCookie.slice(2), config.cookie_secret)
        : rawCookie
      app.sessionStore.get(unsignedCookie, function (err, session) {
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

module.exports = function (app, io) {

  const subscribers = function (x) { return io.in('subscription:' + x) }
  const passthruEvents = [ 'gameRoom:created', 'gameRoom:destroyed' ]
  passthruEvents.forEach(function (event) {
    PubSub.subscribe(event, function () {
      io.emit.apply(io, concat([ event ], toArray(arguments)))
    })
  })

  PubSub.subscribe('gameRoom:playerLeft', function (rid, uid) {
    debug('gameRoom:playerLeft', rid, uid)
    subscribers('gameRoom').emit('gameRoom:playerLeft', rid, uid)
    store.find('user', uid).then(function (user) {
      io.in('chat:' + rid).emit('chat:message:' +  rid, { uid: 0, room: rid, msg: user.username + ' left the room' })
    })
  })
  PubSub.subscribe('gameRoom:playerEntered', function (rid, uid) {
    debug('gameRoom:playerEntered', rid, uid)
    subscribers('gameRoom').emit('gameRoom:playerEntered', rid, uid)
    store.find('user', uid).then(function (user) {
      io.in('chat:' + rid).emit('chat:message:' +  rid, { uid: 0, room: rid, msg: user.username + ' joined the room' })
    })
  })
  PubSub.subscribe('gameRoom:hostChanged', function (rid, uid) {
    debug('gameRoom:hostChanged', rid, uid)
    subscribers('gameRoom').emit('gameRoom:hostChanged', rid, uid)
    store.find('user', uid).then(function (user) {
      io.in('chat:' + rid).emit('chat:message:' +  rid, { uid: 0, room: rid, msg: user.username + ' is now host' })
    })
  })
  PubSub.subscribe('onlinePlayers:userJoined', function (uid) {
    subscribers('onlinePlayers').emit('onlinePlayers:joined', uid)
  })
  PubSub.subscribe('onlinePlayers:userLeft', function (uid) {
    subscribers('onlinePlayers').emit('onlinePlayers:left', uid)
  })

  PubSub.subscribe('gameRoom:ready', function (rid) {
    io.in('room:' + rid).emit('game:launching')
  })

  var disconnections = {}

  io.use(cookieAuth(app))
//  io.use(pp.authenticate('local'))

  io.on('connection', function (sock) {
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

    sock.on('subscribe', function (channel, cb) {
      debug('subscribing to ' + channel)
      sock.join('subscription:' + channel)
      cb && cb()
    })
    sock.on('unsubscribe', function (channel, cb) {
      debug('unsubscribing from ' + channel)
      sock.leave('subscription:' + channel)
      cb && cb()
    })

    // api calls
    sock.on('users:me', function (cb) {
      cb(null, session.uid)
    })

    // Chat API
    const chatDebug = require('debug')('aocmulti:socket-api:chat')
    function roomValidate(room) {
      return room === 'lobby' || /^\d+$/.test(room)
    }
    function chatSubscribe(room, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      chatDebug('subscribing to ' + room)
      sock.join('chat:' + room)
      cb(null)
    }
    function chatSend(room, message, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      loggedUser.then(function (u) {
        chatDebug('sending to ' + room, message)
        io.in('chat:' + room).emit('chat:message:' + room, { rid: room, msg: message, uid: session.uid, username: u.username, flagClassName: 'flag-icon-' + u.country })
        cb(null)
      })
    }
    function chatUnsubscribe(room, cb) {
      if (!roomValidate(room)) return cb(Errors.InvalidRoomError)
      chatDebug('unsubscribing from ' + room)
      sock.leave('chat:' + room)
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
      io.in('room:' + room).emit('chat:message:' + room, { rid: room, msg: 'Game starting…', uid: 0 })
      setTimeout(function () {
        api.startGame(room)
          .then(function () {
            return store.query('gameSession', { userId: session.uid })
              .then(isolate(debug.bind(null, 'gameSession')))
          })
          .then(compose(uuid.unparse, pluck('seskey')))
          .nodeify(cb)
      }, 1000)
    })
    function _gameRoomStarting(rid) {
      if (rid == session.rid) {
        store.query('gameSession', { userId: session.uid }).then(function (ses) {
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
    sock.on('disconnect', function () {
      PubSub.unsubscribe('gameRoom:starting', _gameRoomStarting)
      disconnections[session.uid] = setTimeout(function () {
        api.leaveRoom(session.uid)
        api.offline(session.uid)
      }, 5000)
    })
  })

}
