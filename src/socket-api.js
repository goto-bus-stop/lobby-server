const PubSub = require('./PubSub'),
      api = require('./api'),
      signature = require('cookie-signature'),
      cookieParser = require('cookie-parser')(),
      config = require('./config'),
      debug = require('debug')('socket-api'),
      _ = require('lodash');

const Errors = {
  InvalidRoomError: { type: 'error', msg: 'invalid room' }
};

module.exports = function (app) {
  const io = app.io;
  
  var passthruEvents = [ 'game-created', 'game-starting',
                         'user-joined', 'user-left',
                         'room-destroyed', 'room-joined', 'room-left' ];
  passthruEvents.forEach(function (event) {
    PubSub.subscribe(event, function () {
      var args = [].slice.call(arguments, 0);
      args.unshift(event);
      io.emit.apply(io, args);
    });
  });
  
  // TODO use socket.io's rooms for this
  const subscriptions = {};
  function publishSockets(sub, cb) {
    if (subscriptions[sub]) {
      subscriptions[sub].forEach(cb);
    }
  }

  PubSub.subscribe('room-left', function (uid, rid) {
    api.getUser(uid).then(function (user) {
      io.sockets.in('chat:' + rid).emit('chat:message:' +  rid, { uid: 0, room: rid, msg: user.username + ' left the room' });
    });
  });
  PubSub.subscribe('room-joined', function (uid, rid) {
    api.getUser(uid).then(function (user) {
      io.sockets.in('chat:' + rid).emit('chat:message:' +  rid, { uid: 0, room: rid, msg: user.username + ' joined the room' });
    });
  });
  PubSub.subscribe('user-joined', function (uid) {
    publishSockets('online-players', function (sub) {
      sub.socket.emit('online-players:join', uid);
    });
  });
  PubSub.subscribe('user-left', function (uid) {
    publishSockets('online-players', function (sub) {
      sub.socket.emit('online-players:leave', uid);
    });
  });
  
  var _sockets = [];
  PubSub.subscribe('game-ready', function (rid) {
    io.sockets.in('room:' + rid).emit('game:launching');
  });
  
  var disconnections = {};
  io.on('connection', function (sock) {
    // Ugh. This looks up the HTTP request of the socket connection
    // so we can access the cookies. Obviously socket.io doesn't actually
    // really support this so we're stuck with this ugly hack.
    var req = sock.request;
    // Use our newly obtained request to find our user session
    // (this was just copy-pasted from the `express-session` module)
    cookieParser(req, {}, function () {
      var rawCookie = req.cookies.sid;
      var unsignedCookie = (0 == rawCookie.indexOf('s:'))
        ? signature.unsign(rawCookie.slice(2), config.cookie_secret)
        : rawCookie;
      app.sessionStore.get(unsignedCookie, function (err, session) {
        if (err) throw err;
        if (session != null) {
          connected(session);
        }
        else {
          app.sessionStore.generate(req);
          sock.session = req.session;
          connected(req.session);
        }
      });
    });
    
    function connected(session) {
      // We need to emit a ready event, because all this session stuff
      // means that an instant api call, for example, would likely arrive before our
      // sessions have been resolved. Try to access session.uid = BOOM!
      // To work around that we just wrap aaaalll the socket stuff on the client side
      // in an on('ready') event :/
      sock.emit('ready');
      _sockets.push(sock);
      debug('ready');
      
      if (session && disconnections[session.uid]) {
        clearTimeout(disconnections[session.uid]);
        delete disconnections[session.uid];
      }
      else {
        api.online(session.uid);
      }
      
      sock.on('subscribe', function (channel, cb) {
        if (!subscriptions[channel]) subscriptions[channel] = [];
        
        var subs = subscriptions[channel],
            thisSub = { socket: sock, count: 0 },
            isNew = true;
        for (var i = 0, l = subs.length; i < l; i++) {
          if (subs[i].socket === sock) {
            thisSub = subs[i];
            isNew = false;
            break;
          }
        }
        
        thisSub.count++;
        if (isNew) {
          subs.push(thisSub);
        }
        return cb();
      });
      sock.on('unsubscribe', function (channel, cb) {
        if (subscriptions[channel]) {
          var subs = subscriptions[channel];
          for (var i = 0, l = subs.length; i < l; i++) {
            if (subs[i].socket === sock) {
              subs[i].count--;
              // remove subscription entry if there are no listeners left
              if (subs[i].count <= 0) {
                subs.splice(i, 1);
              }
              break;
            }
          }
        }
        return cb();
      });
      
      // api calls
      sock.on('api:me', function (cb) {
        api.getUser(session.uid).then(function (me) {
          cb(me);
        });
      });
      sock.on('api:user', function (id, cb) {
        api.getUser(id).then(function (user) {
          cb(user);
        });
      });
      sock.on('api:game', function (id, cb) {
        api.getGame(id).then(function (game) {
          cb(game);
        });
      });
      sock.on('api:games', function (cb) {
        api.getGames().then(function (games) {
          cb(games);
        });
      });
      sock.on('api:mods', function (cb) {
        api.getMods().then(function (mods) {
          cb(mods);
        });
      });
      sock.on('api:online', function (cb) {
        api.getOnlineUsers(1).then(function (users) {
          cb(users);
        });
      });
      sock.on('api:join-room', function (rid, cb) {
        if (session.rid) {
          sock.leave('room:' + session.rid);
        }
        api.joinRoom(session.uid, rid)
          .then(function (res) {
            sock.join('room:' + rid);
            session.rid = rid;
            cb(res);
          });
      });
      sock.on('api:leave-room', function (cb) {
        sock.leave('room:' + session.rid);
        api.leaveRoom(session.uid).then(cb);
      });
      
      // User API
      function userFind(id, cb) {
        api.searchUser({ id: id })
          .then(function (users) {
            if (users.length > 0) {
              cb(null, users[0]);
            }
            else {
              cb(false);
            }
          })
          .catch(function (err) {
            cb(err);
          });
      }
      function userFindMany(ids, cb) {
        userQuery({ id: ids }, cb);
      }
      function userQuery(query, cb) {
        api.searchUser(query)
          .then(function (users) {
            cb(null, users);
          })
          .catch(function (err) {
            cb(err);
          });
      }
      sock.on('user:find', userFind);
      sock.on('user:find-many', userFindMany);
      sock.on('user:query', userQuery)
      
      // Chat API
      var chatDebug = require('debug')('socket-api:chat');
      function roomValidate(room) {
        var valid = room === 'lobby' || /^\d+$/.test(room);
        return valid;
      }
      function chatSubscribe(room, cb) {
        if (!roomValidate(room)) return cb(Errors.InvalidRoomError);
        chatDebug('subscribing to ' + room);
        sock.join('chat:' + room);
        cb(null);
      }
      function chatSend(room, message, cb) {
        if (!roomValidate(room)) return cb(Errors.InvalidRoomError);
        chatDebug('sending to ' + room, message);
        io.sockets.in('chat:' + room).emit('chat:message:' + room, { rid: room, msg: message, uid: session.uid });
        cb(null);
      }
      function chatUnsubscribe(room, cb) {
        if (!roomValidate(room)) return cb(Errors.InvalidRoomError);
        chatDebug('unsubscribing from ' + room);
        sock.leave('chat:' + room);
        cb(null);
      }
      sock.on('chat:subscribe', chatSubscribe);
      sock.on('chat:send', chatSend);
      sock.on('chat:unsubscribe', chatUnsubscribe);
      
      // Game API
      sock.on('game:launch', function () {
        var room = session.rid;
        api.startGame(room).then(function () {
          io.sockets.in('room:' + room).emit('chat:message:' + room, { rid: room, msg: 'Game starting…', uid: 0 });
        });
      });
      
      // debug api calls
      sock.on('debug:cleanup-rooms', function () {
        api.cleanupRooms();
      });
      
      // cleanup :D
      sock.on('disconnect', function () {
        function isThisSock(so) { return so !== sock }
        _.remove(_sockets, isThisSock);
        disconnections[session.uid] = setTimeout(function () {
          api.offline(session.uid);
          api.leaveRoom(session.uid);
          PubSub.publish('user-left', session.uid);
          for (var i in subscriptions) if (subscriptions.hasOwnProperty(i)) {
            _.remove(subscriptions[i], isThisSock);
          }
        }, 5000);
      });
    }
  });
  
};