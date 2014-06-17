App.ApplicationController = Ember.Controller.extend({
  pageClassBinding: 'App.page',
  sidebarOpenBinding: 'App.sidebarOpen',
  
  init: function () {
    if (window.__ladders) {
      App.get('ladders').pushObjects(__ladders.map(function (l) { 
        return App.Ladder.create(l);
      }));
    }
  }
});