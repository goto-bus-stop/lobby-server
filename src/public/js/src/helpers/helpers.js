var Ember = require('ember')
  , moment = require('moment')
  , Handlebars = Ember.Handlebars

Handlebars.helper('format', (time, format) => moment(time).format(format))

Handlebars.helper('eq', (a, b) => a === b)
Handlebars.helper('gt', (a, b) => a > b)
Handlebars.helper('lt', (a, b) => a < b)
Handlebars.helper('not', a => !a)

Handlebars.helper('ladder-name', function (lid) {
  var ladder = App.ladders.findBy('id', parseInt(lid, 10))
  return ladder ? ladder.get('fullName') : 'XXX'
})

Handlebars.helper('player-elo', function (player, o) {
  var ladderId = o.hash && o.hash.ladder || 1
  return Ember.get(player.get('ratings')[ladderId], 'elo')
})