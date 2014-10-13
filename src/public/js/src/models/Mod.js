var DS = require('ember-data')

var attr = DS.attr

module.exports = DS.Model.extend({
  title: attr('string')
, descr: attr('string')
, type: attr('string')
, author: DS.belongsTo('user')
})