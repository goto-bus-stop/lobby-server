const _ = require('lodash'),
      Ember = require('./ember');

const Model = Ember.Object.extend({
});

Model.reopenClass({
  find: function (type, id) {
  }
});

module.exports = Model;