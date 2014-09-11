var attr = DS.attr

App.Mod = DS.Model.extend({
  title: attr('string')
, descr: attr('string')
, type: attr('string')
, author: DS.belongsTo('user')
})