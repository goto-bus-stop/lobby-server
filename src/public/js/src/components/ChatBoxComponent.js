var Ember = require('ember')
  , debug = require('debug')('aocmulti:component:chat-box')
  , ChatMessage = require('models/ChatMessage')

module.exports = Ember.Component.extend({
  classNames: [ 'component', 'chat-box' ]
  
, message: ''
, messages: []
  
, onConnected: function () { }
, onDisconnected: function () { }
, onMessage: function (data) {
    var messageDiv = this.$('.chat-messages')
      , isScrolled = messageDiv.prop('scrollHeight') - messageDiv.height() === messageDiv.scrollTop()
    this.get('messages').pushObject(ChatMessage.create(data))
    
    Ember.run(function () {
      Ember.run.schedule('afterRender', function () {
        debug('isScrolled', isScrolled, messageDiv.prop('scrollHeight'), messageDiv.height(), messageDiv.scrollTop())
        if (isScrolled) {
          messageDiv.scrollTop(messageDiv.prop('scrollHeight'))
        }
      })
    })
  }

, connect: function () {
    var room = this.get('room')
      , messages = this.get('messages')
    this.onMessageBound = this.onMessage.bind(this)
    socket.emit('chat:subscribe', room, this.onConnected.bind(this))
    socket.on('chat:message:' + room, this.onMessageBound)
  }.on('didInsertElement')
, disconnect: function () {
    var room = this.get('room')
    socket.emit('chat:unsubscribe', room, this.onDisconnected.bind(this))
    socket.off('chat:message:' + room, this.onMessageBound)
  }.on('willDestroyElement')

, bindEnterKey: function () {
    this.$().find('input').on('keydown', function (e) {
      if (e.keyCode === 13) {
        this.send('sendChat')
      }
    }.bind(this))
  }.on('didInsertElement')
, doAutofocus: function () {
    if (this.get('autofocus')) this.focus()
  }.on('didInsertElement')

, focus: function () {
    this.$().find('input').focus()
  }
  
, actions: {
    sendChat: function () {
      var message = this.get('message')
      this.set('message', '')
      socket.emit('chat:send', this.get('room'), message, function () {})
    }
  }
})