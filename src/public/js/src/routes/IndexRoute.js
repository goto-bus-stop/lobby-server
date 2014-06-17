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