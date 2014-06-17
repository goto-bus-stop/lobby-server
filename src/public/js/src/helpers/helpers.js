Ember.Handlebars.helper('format', function (time, format) {
  return moment(time).format(format);
});

Ember.Handlebars.helper('eq', function (a, b) { return a === b; });
Ember.Handlebars.helper('gt', function (a, b) { return a > b; });
Ember.Handlebars.helper('lt', function (a, b) { return a < b; });
Ember.Handlebars.helper('not', function (a) { return !a; });

Ember.Handlebars.helper('ladderName', function (lid) {
  var ladder = App.get('ladders').findBy('id', lid);
  return ladder ? ladder.get('name') : '';
});