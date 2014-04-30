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