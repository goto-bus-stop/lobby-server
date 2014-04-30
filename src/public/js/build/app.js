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
App.ApplicationController = Ember.Controller.extend({
  pageClassBinding: 'App.page',
  sidebarOpenBinding: 'App.sidebarOpen'
});
App.GameListController = Ember.Controller.extend({
  gamesBinding: 'App.games',
  single: true
});
App.GameRoomController = Ember.ObjectController.extend({
  chatMessages: [],
  chatMessage: '',
  
  actions: {
    sendChat: function () {
      var message = this.get('chatMessage');
      this.set('chatMessage', '');
      socket.emit('chat:room', message);
    },
    launch: function () {
      this.set('status', 'launching');
      socket.emit('api:launch', function (seskey) {
        $('<iframe>').attr('src', 'dprun://' + seskey).appendTo('body');
      });
    }
  }
});
App.IndexController = Ember.Controller.extend({
  gamesBinding: 'App.games',
  gameData: {
    title: '',
    descr: '',
    maxPlayers: 8,
    ladder: 1
  },
  sendingRequest: false,
  chatMessages: [],
  renderPlayerList: true
});
App.ModsController = Ember.ArrayController.extend({
});
Ember.Handlebars.helper('format', function (time, format) {
  return moment(time).format(format);
});
Ember.Handlebars.helper('eq', function (a, b) { return a === b; });
Ember.Handlebars.helper('gt', function (a, b) { return a > b; });
Ember.Handlebars.helper('lt', function (a, b) { return a < b; });
Ember.Handlebars.helper('not', function (a) { return !a; });
Ember.Handlebars.helper('ladderName', function (lid) {
  var ladder = App.get('ladders').findBy('id', lid);
  return ladder ? ladder.get('name') : '';
});

App.ChatMessage = Ember.Object.extend({
  init: function () {
    var user = this.get('user');
    if (!user && this.get('uid') == 0) {
      this.set('isSystemMessage', true);
    }
    else {
      this.set('user', user instanceof App.User ? user : App.User.create(user));
    }
    this.set('time', moment());
  }
});
App.GameRoom = Ember.Object.extend({
  players: [],

  init: function () {
    var self = this;
    this.set('players', Ember.A(
      this.get('players').map(function (p) {
        if (p instanceof App.User) {
          return p;
        }
        else {
          return App.User.create(p);
        }
      })
    ));
    this.set('ladder', App.ladders.findBy('id', parseInt(this.get('ladder'), 10)));
    App.User.find(this.get('host_id')).then(function (host) {
      self.set('host', host);
    });
  },
  
  otherPlayers: (function () {
    var hostId = this.get('host_id');
    return this.get('players').filter(function (p) {
      return p.get('id') !== hostId;
    });
  }).property('players.@each.id'),
  full: (function () {
    return this.get('players.length') >= this.get('max_players');
  }).property('players.length', 'max_players'),
  unlaunchable: (function () {
    return this.get('status') !== 'waiting';
  }).property('status'),
});

App.GameRoom.find = function (id) {
  id = parseInt(id, 10);
  return new Ember.RSVP.Promise(function (resolve) {
    var game = App.get('games').findBy('id', id);
    if (!game) {
      socket.emit('api:game', id, function (game) {
        game = App.GameRoom.create(game);
        App.get('games').pushObject(game);
        resolve(game);
      });
    }
    else {
      resolve(game);
    }
  });
};
App.Ladder = Ember.Object.extend({
});
App.User = Ember.Object.extend({
  init: function () {
    // App.get('players').pushObject(this);
  },
  flagClassName: (function () {
    return 'flag-icon-' + this.get('country');
  }).property('country'),
  defaultRating: (function () {
    return this.get('ratings')[App.settings.defaultLadder];
  }).property('ratings', 'App.settings.defaultLadder'),
  ratingsArray: (function () {
    var ratings = this.get('ratings'), arr = [];
    for (var i in ratings) if (ratings.hasOwnProperty(i)) {
      arr.push({ ladderId: i, rating: ratings[i] });
    }
    return arr;
  }).property('ratings'),
  
  joinRoom: function (roomId) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', roomId, resolve);
    });
  }
});

App.User.find = function (id) {
  id = parseInt(id, 10);
  return new Ember.RSVP.Promise(function (resolve) {
    var user = App.get('players').findBy('id', id);
    if (!user) {
      socket.emit('api:user', id, function (user) {
        user = App.User.create(user);
        App.get('players').pushObject(user);
        resolve(user);
      });
    }
    else {
      resolve(user);
    }
  });
};
App.GameRoomRoute = Ember.Route.extend({
  beforeModel: function (transition) {
    console.log(arguments);
    var params = transition.params[transition.targetName];
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', params.room_id, resolve);
    }).then(function (u) {
      if (u === false) {
        self.transitionTo('index');
        Messenger().post({ type: 'error', message: 'Cannot join room #' + params.room_id });
      }
      return u;
    });
  },
 
  model: function (params) {
    return App.GameRoom.find(params.room_id);
  },
  
  setupController: function (controller, model) {
    this._super(controller, model);

    var onChat = function (chat) {
      console.log('receiving chat', chat);
      App.playSound('message');
      controller.get('chatMessages').pushObject(App.ChatMessage.create(chat));
    };
    socket.on('chat:room', onChat);
    this._onChat = onChat;

  },
  
  actions: {
    willTransition: function () {
      var onChat = this._onChat;
      socket.off('chat:room', onChat);
      socket.emit('api:leave-room', function () {});
    },
    leave: function () {
      this.transitionTo('index');
      this.set('controller.chatMessages', []);
    },
    openSidebar: function () {
      this.render('index', {
        into: 'application',
        outlet: 'sidebar',
        controller: 'gameList'
      });
      App.set('sidebarOpen', true);
    }
  }
});
App.IndexRoute = Ember.Route.extend({  
  actions: {
    join: function (rid) {
      var self = this;
      App.GameRoom.find(rid).then(function (room) {
        if (room.get('locked')) {
          self.transitionTo('game-room', rid, prompt('Enter Password:'));
        }
        else {
          self.transitionTo('game-room', rid);
        }
      });
    },
    createGame: function () {
      var self = this,
          data = this.get('controller.gameData'),
          options = {
            title: data.title,
            descr: data.descr,
            maxPlayers: data.maxPlayers,
            ladder: data.ladder
          };
      if (options.title.length <= 5) {
        alert('That\'s not a very inspiring title, please make it looooooonger :(');
        return;
      }
      this.set('sendingRequest', true);
      $.post('/api/games/', options, function (id) {
        $('#create-game-modal').modal('hide');
        self.set('sendingRequest', false);
        self.transitionTo('game-room', id);
      });
    }
  }
});
var mods;
App.ModsRoute = Ember.Route.extend({
  model: function () {
    if (!mods) {
      mods = new Ember.RSVP.Promise(function (resolve) {
        socket.emit('api:mods', resolve);
      });
    }
    return mods;
  }
});
App.ChatMessageView = Ember.View.extend({
  templateName: 'chat-message'
});
App.GameRoomSummary = Ember.View.extend({
  templateName: 'game-room-summary',
  classNames: [ 'game-room-summary' ]
});

App.GameRoomView = Ember.View.extend({
  didInsertElement: function () {
    var self = this;
    this.$().find('input').on('keydown', function (e) {
      if (e.keyCode === 13) {
        self.get('controller').send('sendChat');
      }
    });
  }
});
App.NumberField = Ember.TextField.extend({
  classNames: [ 'form-control' ],
  type: 'number'
});
App.Select = Ember.Select.extend({
  classNames: [ 'form-control' ]
});
App.TextArea = Ember.TextArea.extend({
  classNames: [ 'form-control' ]
});

App.TextField = Ember.TextField.extend({
  classNames: [ 'form-control' ]
});

App.UserItemView = Ember.View.extend({
  templateName: 'user-item'
});
App.UsernameView = Ember.View.extend({
  templateName: 'username',
  className: 'username'
});