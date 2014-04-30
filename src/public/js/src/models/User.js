App.User = Ember.Object.extend({
  init: function () {
    // App.get('players').pushObject(this);
  },
  flagClassName: (function () {
    return 'flag-icon-' + this.get('country');
  }).property('country'),
  defaultRating: (function () {
    return this.get('ratings')[App.settings.defaultLadder];
  }).property('ratings', 'App.settings.defaultLadder'),
  ratingsArray: (function () {
    var ratings = this.get('ratings'), arr = [];
    for (var i in ratings) if (ratings.hasOwnProperty(i)) {
      arr.push({ ladderId: i, rating: ratings[i] });
    }
    return arr;
  }).property('ratings'),
  
  joinRoom: function (roomId) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve) {
      socket.emit('api:join-room', roomId, resolve);
    });
  }
});

App.User.find = function (id) {
  id = parseInt(id, 10);
  return new Ember.RSVP.Promise(function (resolve) {
    var user = App.get('players').findBy('id', id);
    if (!user) {
      socket.emit('api:user', id, function (user) {
        user = App.User.create(user);
        App.get('players').pushObject(user);
        resolve(user);
      });
    }
    else {
      resolve(user);
    }
  });
};