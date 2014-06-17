App.User = Ember.Object.extend({
  init: function () {
    var usersStore = App.store.get('users');
    if (!usersStore.findBy('id', this.get('id'))) {
      usersStore.pushObject(this);
    }
  },
  flagClassName: function () {
    return 'flag-icon-' + this.get('country');
  }.property('country'),
  defaultRating: function () {
    var ratings = this.get('ratings');
    return ratings[App.settings.defaultLadder];
  }.property('ratings', 'App.settings.defaultLadder'),
  ratingsArray: function () {
    var ratings = this.get('ratings'), arr = [];
    for (var i in ratings) if (ratings.hasOwnProperty(i)) {
      arr.push({ ladderId: i, rating: ratings[i] });
    }
    return arr;
  }.property('ratings'),
  
  joinRoom: function (roomId) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', roomId, resolve);
    });
  }
});

App.store.set('users', Ember.A());
App.User.find = function (id) {
  if (typeof id === 'object') {
    return new Ember.RSVP.Promise(function (resolve) {
      var user = id, userFromStore;
      id = parseInt(Ember.get(id, 'id'), 10);
      userFromStore = App.store.get('users').findBy('id', id);
      if (userFromStore) return resolve(userFromStore);
      resolve(App.User.create(user));
    });
  }
  id = parseInt(id, 10);
  var usersStore = App.store.get('users'),
      user = usersStore.findBy('id', id);
  return new Ember.RSVP.Promise(function (resolve) {
    if (user) return resolve(user);
    socket.emit('user:find', id, function (user) {
      user = App.User.create(user);
      resolve(user);
    });
  });
};
