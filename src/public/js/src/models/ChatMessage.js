App.ChatMessage = Ember.Object.extend({
  isSystemMessage: Ember.computed.equal('uid', 0),
  ensureUserInstance: function () {
    var user = this.get('user');
    if (!user) {
      if (this.get('uid') != 0) {
        App.User.find(this.get('uid')).then(function (user) {
          this.set('user', user);
        }.bind(this));
      }
    }
    else {
      this.set('user', user instanceof App.User ? user : App.User.create(user));
    }
  }.on('init'),
  setTime: function () {
    this.set('time', moment());
  }.on('init')
});