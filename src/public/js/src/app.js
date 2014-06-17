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
      ready = false,
      queued = [];
  sock.on('ready', function () {
    ready = true;
    // drain queue
    var call;
    while (call = queued.shift()) {
      sock[call.func].apply(sock, call.args);
    }
  });
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
