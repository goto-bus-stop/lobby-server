var attr = DS.attr
  , belongsTo = DS.belongsTo
  , hasMany = DS.hasMany
  , debugG = debug('aocmulti:model:gameRoom')
  , get = Ember.get

App.GameRoom = DS.Model.extend({
  title: attr('string')
, descr: attr('string')
, maxPlayers: attr('number')
, ladderId: attr('number')
, hostId: attr('number')
, status: attr('string') 
, serverId: attr('number')
, players: hasMany('user', { async: true })
})