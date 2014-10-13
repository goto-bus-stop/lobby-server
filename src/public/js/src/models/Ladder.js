module.exports = require('ember').Object.extend({
  fullName: function () {
    return this.get('gameType') + ' - ' + this.get('name')
  }.property('gameType', 'name')
})