var mods;
App.ModsRoute = Ember.Route.extend({
  model: function () {
    if (!mods) {
      mods = new Ember.RSVP.Promise(function (resolve) {
        socket.emit('api:mods', resolve);
      });
    }
    return mods;
  }
});