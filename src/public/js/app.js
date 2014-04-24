App = Ember.Application.create({});

App.Router.map(function () {
  this.route('game-room', { path: '/room/:room_id' });
});

var games = Ember.ArrayProxy.create({ content: [] });
var players = Ember.ArrayProxy.create({ content: [] });

App.Ladder = Ember.Object.extend({});
App.User = Ember.Object.extend({
  init: function () {
    players.pushObject(this);
  },
  flagClassName: (function () {
    return 'flag-icon-' + this.get('country');
  }).property('country'),
  
  joinRoom: function (roomId) {
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', roomId, resolve);
    });
  }
});
App.GameRoom = Ember.Object.extend({
  players: [],

  init: function () {
    this.set('players', Ember.ArrayProxy.create({
      content: this.get('players').map(function (p) {
        if (p instanceof App.User) {
          return p;
        }
        else {
          return App.User.create(p);
        }
      })
    }));
  },
  
  full: function () {
    return this.get('players.length') >= this.get('max_players');
  }.property('players.length', 'max_players')
});

App.ladders = [
  App.Ladder.create({ id: 1, name: 'RM - 1v1' })
];

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
  templateName: 'username'
});
App.GameRoomView = Ember.View.extend({
  templateName: 'game-room-summary',
  classNames: [ 'game-room' ]
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
  games: games,
  gameData: {
    title: '',
    descr: '',
    maxPlayers: 8,
    ladder: 1
  },
  sendingRequest: false
});

App.GameRoomRoute = Ember.Route.extend({
  model: function (params) {
    return games.findBy('id', params.room_id);
  }
});

var socket = io.connect('http://' + location.hostname + ':' + location.port);
socket.on('ready', function () {
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
  socket.on('room-joined', function (user, rid) {
    //  console.log(uid , 'joined', rid, games.findBy('id', rid), players.findBy('id', uid));
    games.findBy('id', rid).get('players').pushObject(App.User.create(user));
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

  socket.emit('api:games', function (g) {
    games.clear();
    games.addObjects(g.map(function (game) { return App.GameRoom.create(game); }));
  });
});

var createBt = $('#create-game-create');
createBt.on('click', function (e) {
  createBt.attr('disabled', true);
  e.preventDefault();
  var options = {};
  $('#create-game-form').serializeArray().forEach(function (a) {
    options[a.name] = a.value;
  });
  $.post('/api/games/', options, function () {
    createBt.attr('disabled', false);
    $('#create-game-modal').modal('hide');
  });
});