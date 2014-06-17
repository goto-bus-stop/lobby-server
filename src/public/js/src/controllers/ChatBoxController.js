App.ChatBoxController = Ember.Controller.extend({
  actions: {
    sendChat: function () {
      var message = this.get('message');
      this.set('message', '');
      socket.emit('chat:send', this.get('room'), message, function () {});
    }
  }
});