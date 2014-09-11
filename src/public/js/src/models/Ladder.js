App.Ladder = Ember.Object.extend({
  fullName: function () {
    return this.get('gameType') + ' - ' + this.get('name')
  }.property('gameType', 'name')
})