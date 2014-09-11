var debugA = debug('aocmulti:route:application')
  , Promise = Ember.RSVP.Promise

App.ApplicationRoute = Ember.Route.extend({
  
  addLadders: function () {
    if (window.__ladders) {
      debugA('adding ladders')
      App.get('ladders').pushObjects(__ladders.map(function (l) { 
        return App.Ladder.create(l)
      }))
    }
  }.on('init')
  
, model: function () {
    var store = this.store
    
    return new Promise(function (resolve, reject) {
      socket.emit('users:me', App.promisify(resolve, reject))
    }).then(function (id) {
      return store.find('user', id)
    }).then(function (user) {
      debugA('found', user)
      App.set('user', user)
      return user
    })
  }

})