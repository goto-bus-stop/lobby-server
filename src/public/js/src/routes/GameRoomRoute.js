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