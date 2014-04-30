App.ChatMessage = Ember.Object.extend({
  init: function () {
    var user = this.get('user');
    if (!user && this.get('uid') == 0) {
      this.set('isSystemMessage', true);
    }
    else {
      this.set('user', user instanceof App.User ? user : App.User.create(user));
    }
    this.set('time', moment());
  }
});