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