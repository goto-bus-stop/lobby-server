var DS = require('ember-data')
  , debug = require('debug')('aocmulti:model:room')

var attr = DS.attr
  , belongsTo = DS.belongsTo
  , hasMany = DS.hasMany

module.exports = DS.Model.extend({
  title: attr('string')
, descr: attr('string')
, maxPlayers: attr('number')
, ladderId: attr('number')
, hostId: attr('number')
, status: attr('string') 
, serverId: attr('number')
, players: hasMany('user', { async: true })
})