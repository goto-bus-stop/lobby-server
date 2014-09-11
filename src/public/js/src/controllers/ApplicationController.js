var debugA = debug('aocmulti:controller:application')

App.ApplicationController = Ember.Controller.extend({
  pageClassBinding: 'App.page'
, sidebarOpenBinding: 'App.sidebarOpen'
})