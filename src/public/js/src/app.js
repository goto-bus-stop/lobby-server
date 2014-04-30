// Need to rename to whatever our client name is gonna be
App = Ember.Application.create({});

// routes
App.Router.map(function () {
  this.route('game-room', { path: '/room/:room_id' });
  this.route('profile', { path: '/profile/:user_id' });
  this.route('mods');
  this.route('mod', { path: '/mods/:mod_id' });
  this.route('mod-install', { path: '/mods/:mod_id/install' });
});

App.reopen({
  // We will hibernate when games are running, so we don't tax the user's pc too much.
  hibernate: function () {
    socket.disconnect();
  },
  // current page
  page: 'application',
  sidebarOpen: false,
  
  // some sound management
  soundsCache: {},
  playSound: function (s) {
    return;
    if (!this.soundsCache[s]) {
      this.soundsCache[s] = $('<audio>').attr('src', 'sound/' + s + '.wav').appendTo('body')[0];
    }
    this.soundsCache[s].play();
  },
  
  
  onlinePlayers: Ember.A()
});

// These things are going to be customizable at some point
App.Settings = Ember.Object.extend({
  defaultLadder: 1
});
App.settings = App.Settings.create({});

// local caches
// TODO make this some more official local store, maybe with SessionStorage or something.
// TODO move games store into IndexController
// TODO move online players store into an OnlinePlayersView
// For now this is ugly.
App.set('games', Ember.A());
App.set('players', Ember.A());
App.set('ladders', Ember.A());
App.set('onlinePlayers', App.onlinePlayers);

// defer this because App.Ladder does not exist because I haven't split all this init up yet
// This should probably happen in a Controller somewhere
setTimeout(function () {
  App.get('ladders').pushObjects(__ladders.map(function (l) { 
    return App.Ladder.create(l);
  }));
}, 0);

// socket.io shim that allows us to send events before the server has finished authenticating us
var socket = new function () {
  var sock = io.connect('http://' + location.hostname + ':' + location.port),
      ready = false;
  sock.on('ready', function () {
    ready = true;
    // drain queue
    var call;
    while (call = queued.shift()) {
      sock[call.func].apply(sock, call.args);
    }
  });
  var queued = [];
  function stub(fn) {
    return function () {
      if (ready) {
        sock[fn].apply(sock, arguments);
      }
      else {
        queued.push({ func: fn, args: arguments });
      }
    };
  }
  return {
    emit: stub('emit'),
    on: stub('on'),
    off: stub('removeListener'),
    disconnect: sock.disconnect.bind(sock)
  };
};

// WebSocket events
socket.on('game-created', function (data) {
  games.addObject(App.GameRoom.create(data));
});
socket.on('game-starting', function (data) {
  games.findBy('id', data).set('status', 'launching');
});
socket.on('room-left', function (uid, rid) {
  App.GameRoom.find(rid).then(function (room) {
    var players = room.get('players'),
        remove = [];
    players.forEach(function (p) {
      if (p.get('id') == uid) {
        remove.push(p);
      }
    });
    remove.forEach(function (i) {
      players.removeObject(i);
    });
  });
});
socket.on('room-joined', function (uid, rid) {
  App.User.find(uid).then(function (user) {
    var room = App.get('games').findBy('id', parseInt(rid, 10));
    room.get('players').pushObject(user);
    if (App.user.get('in_room_id') === rid) {
      if (room.get('full')) {
        App.playSound('room-full');
      }
      else {
        App.playSound('room-joined');
      }
    }
  });
});
socket.on('room-destroyed', function (rids) {
  if (!Array.isArray(rids)) {
    rids = [ rids ];
  }
  var remove = [];
  rids.forEach(function (deletedId) {
    games.forEach(function (game, i) {
      if (game.get('id') == deletedId) {
        remove.push(game);
      }
    });
  });
  remove.forEach(function (i) {
    games.removeObject(i);
  });
});
socket.on('user-joined', function (uid) {
  if (!App.onlinePlayers.anyBy('id', uid)) {
    App.User.find(uid).then(function (user) {
      App.onlinePlayers.pushObject(user);
    });
  }
});
socket.on('user-left', function (uid) {
  App.onlinePlayers.any(function (p, i) {
    if (p.get('id') === uid) {
      App.onlinePlayers.removeAt(i);
      return true;
    }
  });
});

// We want to know some things as soon as the socket is ready
// TODO move api:games call to IndexController
socket.emit('api:games', function (g) {
  var games = App.get('games');
  games.clear();
  games.addObjects(g.map(function (game) { return App.GameRoom.create(game); }));
});
socket.emit('api:me', function (me) {
  App.set('user', App.User.create(me));
});
// TODO move api:online call to an OnlinePlayersView
socket.emit('api:online', function (u) {
  App.onlinePlayers.clear();
  App.onlinePlayers.addObjects(u.map(function (user) { return App.User.create(user); }));
});