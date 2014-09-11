App.ChatMessage = Ember.Object.extend({
  isSystemMessage: Ember.computed.equal('uid', 0)
  
, setTimeReceived: function () {
    this.set('time', moment())
  }.on('init')
})
