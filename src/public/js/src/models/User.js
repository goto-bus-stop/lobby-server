var attr = DS.attr

App.User = DS.Model.extend({
  username: attr('string')
, country: attr('string')
, status: attr('string')
, inRoom: DS.belongsTo('gameRoom')
, ratings: attr()

  // properties
, flagClassName: function () {
    return 'flag-icon-' + this.get('country')
  }.property('country')
//
//, defaultRating: function () {
//    var ratings = this.get('ratings')
//    return ratings && ratings[App.settings.defaultLadder]
//  }.property('ratings', 'App.settings.defaultLadder')

, ratingsArray: function () {
    var ratings = this.get('ratings'), arr = []
    for (var i in ratings) if (ratings.hasOwnProperty(i)) {
      arr.push({ ladderId: i, rating: ratings[i] })
    }
    return arr
  }.property('ratings')
})