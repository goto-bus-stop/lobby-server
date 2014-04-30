App.GameRoomView = Ember.View.extend({
  didInsertElement: function () {
    var self = this;
    this.$().find('input').on('keydown', function (e) {
      if (e.keyCode === 13) {
        self.get('controller').send('sendChat');
      }
    });
  }
});