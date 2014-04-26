App = Ember.Application.create({
  hibernate: function () {
    socket(function (sock) {
      sock.disconnect();
    });
  },
  page: 'application',
  
  onlinePlayers: Ember.A()
});

App.Settings = Ember.Object.extend({
  defaultLadder: 1
});
App.settings = App.Settings.create({});

App.ApplicationController = Ember.Controller.extend({
  pageClassBinding: 'App.page'
});

Ember.Handlebars.helper('format', function (time, format) {
  return moment(time).format(format);
});
Ember.Handlebars.helper('eq', function (a, b) { return a === b; });
Ember.Handlebars.helper('gt', function (a, b) { return a > b; });
Ember.Handlebars.helper('lt', function (a, b) { return a < b; });
Ember.Handlebars.helper('not', function (a) { return !a; });

App.Router.map(function () {
  this.route('game-room', { path: '/room/:room_id' });
});

var games = App.games = Ember.A();
var players = App.players = Ember.A();
App.ladders = Ember.A();

App.Ladder = Ember.Object.extend({});
App.User = Ember.Object.extend({
  init: function () {
    players.pushObject(this);
  },
  flagClassName: (function () {
    return 'flag-icon-' + this.get('country');
  }).property('country'),
  defaultRating: (function () {
    return this.get('ratings')[App.settings.defaultLadder];
  }).property('ratings', 'App.settings.defaultLadder'),
  
  joinRoom: function (roomId) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve) {
      socket(function (sock) {
        sock.emit('api:join-room', roomId, resolve);
      });
    });
  }
});
App.User.find = function (id) {
  id = parseInt(id, 10);
  return new Ember.RSVP.Promise(function (resolve) {
    var user = App.players.findBy('id', id);
    if (!user) {
      socket(function (sock) {
        sock.emit('api:user', id, function (user) {
          user = App.User.create(user);
          App.players.pushObject(user);
          resolve(user);
        });
      });
    }
    else {
      resolve(user);
    }
  });
};

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
    var game = App.games.findBy('id', id);
    if (!game) {
      socket(function (sock) {
        sock.emit('api:game', id, function (game) {
          game = App.GameRoom.create(game);
          games.pushObject(game);
          resolve(game);
        });
      });
    }
    else {
      resolve(game);
    }
  });
};

App.GameRoomView = Ember.View.extend({
  didInsertElement: function () {
    var self = this;
    this.$().find('#game-room-chat-message').on('keydown', function (e) {
      if (e.keyCode === 13) {
        self.get('controller').send('sendChat');
      }
    });
  }
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
App.ChatMessageView = Ember.View.extend({
  templateName: 'chat-message'
});

App.ladders.pushObjects(__ladders.map(function (l) { 
  return App.Ladder.create(l);
}));

App.TextField = Ember.TextField.extend({
  classNames: [ 'form-control' ]
});
App.TextArea = Ember.TextArea.extend({
  classNames: [ 'form-control' ]
});
App.NumberField = Ember.TextField.extend({
  classNames: [ 'form-control' ],
  type: 'number'
});
App.Select = Ember.Select.extend({
  classNames: [ 'form-control' ]
});

App.UsernameView = Ember.View.extend({
  templateName: 'username',
  className: 'username'
});
App.UserItemView = Ember.View.extend({
  templateName: 'user-item'
});
App.GameRoomSummary = Ember.View.extend({
  templateName: 'game-room-summary',
  classNames: [ 'game-room-summary' ]
});

user = App.User.create();

App.IndexRoute = Ember.Route.extend({  
  actions: {
    join: function (rid) {
      var self = this;
      user.joinRoom(rid).then(function () {
        if (!window.DONT_TRANSITION) self.transitionTo('game-room', rid);
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
App.IndexController = Ember.Controller.extend({
  games: App.games,
  gameData: {
    title: '',
    descr: '',
    maxPlayers: 8,
    ladder: 1
  },
  sendingRequest: false,
  chatMessages: []
});

App.GameRoomRoute = Ember.Route.extend({
  model: function (params) {
    return App.GameRoom.find(params.room_id);
  },
  
  setupController: function (controller, model) {
    var self = this;
    this._super(controller, model);
    socket(function (sock) {
      var onChat = function (chat) {
        if (chat.room !== controller.get('id')) {
          sock.removeListener('chat:room', onChat);
        }
        controller.get('chatMessages').pushObject(App.ChatMessage.create(chat));
      };
      sock.on('chat:room', onChat);
      self._onChat = onChat;
    });
  },
  
  actions: {
    willTransition: function () {
      var onChat = this._onChat;
      socket(function (sock) {
        sock.removeListener('chat:room', onChat);
        sock.emit('api:leave-room', function () {});
      });
    },
    leave: function () {
      this.transitionTo('index');
      this.set('controller.chatMessages', []);
    }
  }
});
App.GameRoomController = Ember.ObjectController.extend({
  chatMessages: [],
  message: '',
  
  actions: {
    sendChat: function () {
      var message = this.get('message');
      this.set('message', '');
      socket(function (sock) {
        sock.emit('chat:room', message);
      });
    },
    launch: function () {
      this.set('status', 'launching');
      socket(function (sock) {
        sock.emit('api:launch', function (seskey) {
          $('<iframe>').attr('src', 'dprun://' + seskey).appendTo('body');
        });
      });
    }
  }
});

var socket = new function () {
  var sock = io.connect('http://' + location.hostname + ':' + location.port),
      ready = false;
  sock.on('ready', function () { ready = true; });
  return function (cb) {
    var promise = new Ember.RSVP.Promise(function (resolve) {
      if (ready) resolve(sock);
      else {
        sock.on('ready', function () {
          resolve(sock);
        });
      }
    })
    if (cb) promise = promise.then(cb);
    return promise;
  };
}
socket(function (socket) {
  socket.on('game-created', function (data) {
    games.addObject(App.GameRoom.create(data));
  });
  socket.on('game-starting', function (data) {
    games.findBy('id', data).set('status', 'launching');
  });
  socket.on('room-left', function (uid, rid) {
    var players = games.findBy('id', rid).get('players'),
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
  socket.on('room-joined', function (uid, rid) {
    App.User.find(uid).then(function (user) {
      App.games.findBy('id', parseInt(rid, 10)).get('players').pushObject(user);
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

  socket.emit('api:games', function (g) {
    App.games.clear();
    App.games.addObjects(g.map(function (game) { return App.GameRoom.create(game); }));
  });
  socket.emit('api:online', function (u) {
    App.onlinePlayers.clear();
    App.onlinePlayers.addObjects(u.map(function (user) { return App.User.create(user); }));
  });
});