App.GameRoomController = Ember.ObjectController.extend({
  hosting: (function () {
    return App.get('user.id') === this.get('host_id');
  }).property('host_id'),
  
  actions: {
    launch: function () {
      this.set('status', 'launching');
      socket.emit('game:launch', function (seskey) {
        $.Element('iframe.hide').attr('src', App.PROTOCOL + '://launch/' + seskey).appendTo('body');
      });
    }
  }
});
