define(function (require, exports, module) {

  var Ember = require('ember')
    , moment = require('moment')
    , Handlebars = Ember.Handlebars

  Handlebars.helper('format', function (time, format) {
    return moment(time).format(format)
  })

  Handlebars.helper('eq', function (a, b) { return a === b })
  Handlebars.helper('gt', function (a, b) { return a > b })
  Handlebars.helper('lt', function (a, b) { return a < b })
  Handlebars.helper('not', function (a) { return !a })

  Handlebars.helper('ladder-name', function (lid) {
    var ladder = App.ladders.findBy('id', parseInt(lid, 10))
    return ladder ? ladder.get('fullName') : 'XXX'
  })

  Handlebars.helper('player-elo', function (player, o) {
    var ladderId = o.hash && o.hash.ladder || 1
    return Ember.get(player.get('ratings')[ladderId], 'elo')
  })

})