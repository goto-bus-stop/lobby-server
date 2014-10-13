var Ember = require('ember')
  , debug = require('debug')('aocmulti:route:application')

var Promise = Ember.RSVP.Promise

module.exports = Ember.Route.extend({
  
  addLadders: function () {
    if (window.__ladders) {
      debug('adding ladders')
      App.get('ladders').pushObjects(__ladders.map(l => App.Ladder.create(l)))
    }
  }.on('init')
  
, model: function () {
    var store = this.store
    
    return new Promise(function (resolve, reject) {
      socket.emit('users:me', App.promisify(resolve, reject))
    })
      .then(id => store.find('user', id))
      .then(function (user) {
        debug('found', user)
        App.set('user', user)
        return user
      })
  }

})