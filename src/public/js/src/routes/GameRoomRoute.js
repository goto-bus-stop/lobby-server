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
