var debug = require('debug')('aocmulti:controller:application')

module.exports = require('ember').Controller.extend({
  pageClassBinding: 'App.page'
, sidebarOpenBinding: 'App.sidebarOpen'
})