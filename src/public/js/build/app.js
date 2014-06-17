// Need to rename to whatever our client name is gonna be
App = Ember.Application.create({});
App.deferReadiness();

App.PROTOCOL = 'DPRun';

App.store = Ember.Object.create({});

App.reopen({
  // We will hibernate when games are running, so we don't tax the user's browser too much.
  hibernate: function () {
    socket.emit('hibernate');
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
  
  prompt: function (title, msg, type) {
    type = type || 'text';
    var inp = $('<input>').attr('type', type),
        ok = $('<button>').addClass('btn btn-primary').text('OK'),
        modal = $('<div>').addClass('modal'),
        modalDialog = $('<div>').addClass('modal-dialog'),
        modalContent = $('<div>').addClass('modal-content'),
        modalHeader = $('<header>').addClass('modal-header'),
        modalTitle = $('<h4>').addClass('modal-title').text(title),
        modalBody = $('<div>').addClass('modal-body').append(msg, inp),
        modalFooter = $('<footer>').addClass('modal-footer').append(ok);
    
    return new Ember.RSVP.Promise(function (resolve, reject) {
      ok.on('click', function () {
        resolve(inp.val());
        modal.remove();
      });

      modal.append(
        modalDialog.append(
          modalContent.append(
            modalHeader.append(modalTitle),
            modalBody,
            modalFooter
          )
        )
      ).appendTo('body').modal({ backdrop: false });
    });
  },
  
  notify: function (o) {
    console[type === 'error' ? 'error' : 'log'](o.message);
  }
});

// These things are going to be customizable at some point
App.Settings = Ember.Object.extend({
  defaultLadder: 1
});
App.settings = App.Settings.create({});

// local caches
// TODO make this some more official local store, maybe with SessionStorage or something.
// For now this is ugly.
App.set('players', Ember.A());
App.set('ladders', Ember.A());

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
  App.store.get('games').addObject(App.GameRoom.create(data));
});
socket.on('game-starting', function (data) {
  App.store.get('games').findBy('id', data).set('status', 'launching');
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
    var room = App.store.get('games').findBy('id', parseInt(rid, 10));
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

// We want to know some things as soon as the socket is ready
socket.emit('api:me', function (me) {
  App.set('user', App.User.create(me));
  App.advanceReadiness();
});

App.Router.map(function () {
  this.route('game-room', { path: '/room/:room_id' });
  this.route('profile', { path: '/profile/:user_id' });
  this.route('mods');
  this.route('mod', { path: '/mods/:mod_id' });
  this.route('mod-install', { path: '/mods/:mod_id/install' });
});

App.Router.reopen({
  location: 'auto'
});
/*
App.ApplicationAdapter = DS.Adapter.extend({
  createRecord: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      reject();
    });
  },
  deleteRecord: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      reject();
    });
  },
  find: function (store, type, id) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:find-' + type, id, function (user) {
        resolve(user);
      });
    });
  },
  findMany: function (store, type, ids) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:find-many-' + type, ids, function (users) {
        resolve(users);
      });
    });
  },
  findQuery: function (store, type, query) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:query-' + type, query, function (users) {
        resolve(users);
      });
    });
  },
  
  updateRecord: function (store, type, record) {
    var data = this.serialize(record, { includeId: true }),
        id = record.get('id');
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:update-' + type, id, data, function (ok) {
        reject(ok);
      });
    });
  }
});
*/
/*
App.GameRoomAdapter = DS.Adapter.extend({
});
*/
App.BsPanelComponent = Ember.Component.extend({
//  layoutName: 'panel',
  classNames: [ 'panel', 'panel-default' ]
});
App.ChatBoxComponent = Ember.Component.extend({
  classNames: 'chat-box',
  
  message: '',
  messages: [],
  
  onConnected: function () { },
  onDisconnected: function () { },
  onMessage: function (data) {
    this.get('messages').pushObject(App.ChatMessage.create(data));
  },

  connect: function () {
    var room = this.get('room'), messages = this.get('messages');
    this.onMessageBound = this.onMessage.bind(this);
    socket.emit('chat:subscribe', room, this.onConnected.bind(this));
    socket.on('chat:message:' + room, this.onMessageBound);
  }.on('didInsertElement'),
  disconnect: function () {
    var room = this.get('room');
    socket.emit('chat:unsubscribe', room, this.onDisconnected.bind(this));
    socket.off('chat:message:' + room, this.onMessageBound);
  }.on('willDestroyElement'),

  bindEnterKey: function () {
    this.$().find('input').on('keydown', function (e) {
      if (e.keyCode === 13) {
        this.send('sendChat');
      }
    }.bind(this));
  }.on('didInsertElement'),
  
  actions: {
    sendChat: function () {
      var message = this.get('message');
      this.set('message', '');
      socket.emit('chat:send', this.get('room'), message, function () {});
    }
  }
});
App.OnlinePlayersComponent = Ember.Component.extend({
  tagName: 'ul',
  classNames: [ 'list-unstyled' ],
  
  onlinePlayers: Ember.A(),
  
  onConnected: function (userIds) {
    var onlinePlayers = this.get('onlinePlayers');
    socket.emit('api:online', function (p) {
      onlinePlayers.clear();
      Ember.RSVP.all(
        p.map(function (u) {
          return App.User.find(u);
        })
      ).then(function (players) {
        onlinePlayers.pushObjects(players);
      });
    });
  },
  onDisconnected: function () {
  },
  onJoin: function (p) {
    this.get('onlinePlayers').pushObject(App.User.find(p));
  },
  onLeave: function (p) {
    var onlinePlayers = this.get('onlinePlayers');
    onlinePlayers.any(function (online, i) {
      if (online.get('id') === p.id) {
        onlinePlayers.removeAt(i);
        return true;
      }
    });
  },
  
  connect: function () {
    socket.emit('subscribe', 'online-players', this.onConnected.bind(this));
    this.onJoinBound = this.onJoin.bind(this);
    this.onLeaveBound = this.onLeave.bind(this);
    socket.on('online-players:join', this.onJoinBound);
    socket.on('online-players:leave', this.onLeaveBound);
  }.on('didInsertElement'),
  disconnect: function () {
    socket.emit('unsubscribe', 'online-players', this.onDisconnected.bind(this));
    socket.off('online-players:join', this.onJoinBound);
    socket.off('online-players:leave', this.onLeaveBound);
  }.on('willDestroyElement'),
});
App.ChatMessage = Ember.Object.extend({
  isSystemMessage: Ember.computed.equal('uid', 0),
  ensureUserInstance: function () {
    var user = this.get('user');
    if (!user) {
      if (this.get('uid') != 0) {
        App.User.find(this.get('uid')).then(function (user) {
          this.set('user', user);
        }.bind(this));
      }
    }
    else {
      this.set('user', user instanceof App.User ? user : App.User.create(user));
    }
  }.on('init'),
  setTime: function () {
    this.set('time', moment());
  }.on('init')
});
App.GameRoom = Ember.Object.extend({
  players: [],

  _init: function () {
    var self = this,
        gamesStore = App.store.get('games');
    if (!gamesStore.findBy('id', this.get('id'))) {
      gamesStore.pushObject(this);
    }
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
    this.set('ladder', App.ladders.findBy('id', parseInt(this.get('ladder_id'), 10)));
    App.User.find(this.get('host_id')).then(function (host) {
      self.set('host', host);
    });
  }.on('init'),
  
  otherPlayers: (function () {
    var hostId = this.get('host_id');
    return this.get('players').filter(function (p) {
      return p.get('id') !== hostId;
    });
  }).property('players.@each.id'),
  full: Ember.computed.gte('players.length', 'max_players'),
  launchable: Ember.computed.equal('status', 'waiting'),
  unlaunchable: Ember.computed.not('launchable')
});

App.store.set('games', Ember.A());
App.GameRoom.find = function (id) {
  id = parseInt(id, 10);
  var gamesStore = App.store.get('games'),
      game = gamesStore.findBy('id', id);
  return new Ember.RSVP.Promise(function (resolve) {
    if (game) return resolve(game);
    socket.emit('api:game', id, function (game) {
      game = App.GameRoom.create(game);
      resolve(game);
    });
  });
};

App.Ladder = Ember.Object.extend({
});
App.User = Ember.Object.extend({
  init: function () {
    var usersStore = App.store.get('users');
    if (!usersStore.findBy('id', this.get('id'))) {
      usersStore.pushObject(this);
    }
  },
  flagClassName: function () {
    return 'flag-icon-' + this.get('country');
  }.property('country'),
  defaultRating: function () {
    var ratings = this.get('ratings');
    return ratings[App.settings.defaultLadder];
  }.property('ratings', 'App.settings.defaultLadder'),
  ratingsArray: function () {
    var ratings = this.get('ratings'), arr = [];
    for (var i in ratings) if (ratings.hasOwnProperty(i)) {
      arr.push({ ladderId: i, rating: ratings[i] });
    }
    return arr;
  }.property('ratings'),
  
  joinRoom: function (roomId) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', roomId, resolve);
    });
  }
});

App.store.set('users', Ember.A());
App.User.find = function (id) {
  if (typeof id === 'object') {
    return new Ember.RSVP.Promise(function (resolve) {
      var user = id, userFromStore;
      id = parseInt(Ember.get(id, 'id'), 10);
      userFromStore = App.store.get('users').findBy('id', id);
      if (userFromStore) return resolve(userFromStore);
      resolve(App.User.create(user));
    });
  }
  id = parseInt(id, 10);
  var usersStore = App.store.get('users'),
      user = usersStore.findBy('id', id);
  return new Ember.RSVP.Promise(function (resolve) {
    if (user) return resolve(user);
    socket.emit('user:find', id, function (user) {
      user = App.User.create(user);
      resolve(user);
    });
  });
};

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
jQuery.Element = function (selector) {
  var tag = selector.match(/^\w+/),
      element = jQuery('<' + (tag ? tag[0] : 'div') + '>'),
      id, classNames;

  if (id = selector.match(/#([\w-]+)/)) {
    element.attr('id', id[1]);
  }
  if (classNames = selector.match(/\.[\w-]+/g)) {
    element.attr('class', classNames.join(' ').replace(/\./g, ''));
  }

  return element;
};
App.ApplicationController = Ember.Controller.extend({
  pageClassBinding: 'App.page',
  sidebarOpenBinding: 'App.sidebarOpen',
  
  init: function () {
    if (window.__ladders) {
      App.get('ladders').pushObjects(__ladders.map(function (l) { 
        return App.Ladder.create(l);
      }));
    }
  }
});
App.ChatBoxController = Ember.Controller.extend({
  actions: {
    sendChat: function () {
      var message = this.get('message');
      this.set('message', '');
      socket.emit('chat:send', this.get('room'), message, function () {});
    }
  }
});
App.GameListController = Ember.Controller.extend({
  gamesBinding: 'App.games',
  single: true
});
App.GameRoomController = Ember.ObjectController.extend({
  hosting: (function () {
    return App.get('user.id') === this.get('host_id');
  }).property('host_id'),
  
  actions: {
    launch: function () {
      this.set('status', 'launching');
      socket.emit('game:launch', function (seskey) {
        $.Element('iframe.hide').attr('src', App.PROTOCOL + '://launch/' + seskey).appendTo('body');
      });
    }
  }
});

App.IndexController = Ember.Controller.extend({
  games: [],
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
App.OnlinePlayersController = Ember.Controller.extend({
  onlinePlayers: Ember.A()
});
App.GameRoomRoute = Ember.Route.extend({
  beforeModel: function (transition) {
    var params = transition.params[transition.targetName];
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', params.room_id, resolve);
    }).then(function (u) {
      if (u === false) {
        this.transitionTo('index');
        App.notify({ type: 'error', message: 'Cannot join room #' + params.room_id });
      }
      return u;
    }.bind(this));
  },
 
  model: function (params) {
    return App.GameRoom.find(params.room_id);
  },
  afterModel: function (room) {
    if (room.get('locked')) {
      return new Ember.RSVP.Promise(function (resolve, reject) {
        App.prompt(room.get('title'), 'Password', 'password')
          .then(
            function okd(passw) {
              if (passw !== /* @todo MAKE THIS. */'password') {
                reject();
                this.transitionTo('index');
                App.notify({ type: 'error', message: 'Incorrect password for room #' + room.get('id') });
              }
              else {
                resolve();
              }
            }.bind(this),
            function cancelled() { reject() }
          );
      }.bind(this));
    }
  },
  
  actions: {
    willTransition: function () {
      socket.emit('api:leave-room', function () {});
    },
    leave: function () {
      this.transitionTo('index');
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
  setupController: function (controller) {
    var games = controller.get('games');
    socket.emit('api:games', function (g) {
      games.clear();
      games.addObjects(g.map(function (game) { return App.GameRoom.create(game); }));
    });
  },
  
  actions: {
//    join: function (rid) {
//      var self = this;
//      App.GameRoom.find(rid).then(function (room) {
//        if (room.get('locked')) {
//          self.transitionTo('game-room', rid/*, prompt('Enter Password:')*/);
//        }
//        else {
//          self.transitionTo('game-room', rid);
//        }
//      });
//    },
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
  templateName: 'user-item',
  didInsertElement: function () {
    var el = this.$();
    el.on('mousemove', function (e) {
      var tooltip = el.find('.user-tooltip'),
        p = $(tooltip[0].offsetParent).offset();
      tooltip.css({
        position: 'absolute',
        top: (e.clientY - p.top) + 'px',
        left: (e.clientX - p.left) + 'px'
      });
    });
    el.on('mouseenter', function() { el.find('.user-tooltip').removeClass('hide') });
    el.on('mouseleave', function() { el.find('.user-tooltip').addClass('hide') });
  }
});
App.UserTooltipView = Ember.View.extend({
  templateName: 'user-tooltip'
});
App.UsernameView = Ember.View.extend({
  templateName: 'username',
  className: 'username',
});