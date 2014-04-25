var PubSub = require('./PubSub'),
    api = require('./api'),
    signature = require('cookie-signature'),
    cookieParser = require('cookie-parser')(),
    config = require('./config');

module.exports = function (app) {
  var io = app.io;
  
  var passthruEvents = [ 'game-created', 'game-starting', 'game-destroyed', 'room-joined', 'room-left' ];
  passthruEvents.forEach(function (event) {
    PubSub.subscribe(event, function () {
      var args = [].slice.call(arguments, 0);
      args.unshift(event);
      io.sockets.emit.apply(io.sockets, args);
    });
  });

  PubSub.subscribe('room-left', function (uid, rid) {
    api.getUser(uid).then(function (user) {
      io.sockets.in(rid).emit('chat:room', {
        uid: 0,
        room: rid,
        msg: user.username + ' left the room'
      });
    });
  });
  PubSub.subscribe('room-joined', function (uid, rid) {
    api.getUser(uid).then(function (user) {
      io.sockets.in(rid).emit('chat:room', {
        uid: 0,
        room: rid,
        msg: user.username + ' joined the room'
      });
    });
  });
  
  io.sockets.on('connection', function (sock) {
    // Ugh. This looks up the HTTP request of the socket connection
    // so we can access the cookies. Obviously socket.io doesn't actually
    // really support this so we're stuck with this ugly hack.
    var req = sock.manager.transports[sock.id].req;
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
      sock.on('api:join-room', function (rid, cb) {
        api.joinRoom(session.uid, rid)
          .then(function (res) {
            sock.join(rid);
            session.rid = rid;
            cb(res);
          });
      });
      sock.on('api:leave-room', function (cb) {
        api.leaveRoom(session.uid).then(cb);
      });
      
      sock.on('chat:room', function (msg) {
        api.getUser(session.uid).then(function (user) {
          io.sockets.in(session.rid).emit('chat:room', {
            uid: session.uid,
            user: user,
            room: session.rid,
            msg: msg
          });
        });
      });
      
      // debug api calls
      sock.on('debug:cleanup-rooms', function () {
        api.cleanupRooms();
      });
      
      
      // cleanup :D
      sock.on('disconnect', function () {
        api.leaveRoom(session.uid);
      });
    }
  });
  
};