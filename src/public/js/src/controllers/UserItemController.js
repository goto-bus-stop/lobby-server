var Ember = require('ember')
  , debug = require('debug')('aocmulti:controller:userItem')

module.exports = Ember.ObjectController.extend({
  needs: [ 'settings' ]
  
, defaultRating: function () {
    var ratings = this.get('content.ratings')
      , defaultLadder = this.get('controllers.settings.defaultLadder')
    return ratings && ratings[defaultLadder]
  }.property('controllers.settings.defaultLadder', 'content.ratings')

})