const Ember = require('../lib/ember-runtime').__loader;

global.MetamorphENV = {};
Ember.require('ember-metal/core')['default'].EXTEND_PROTOTYPES = true;

Ember.require('ember-runtime/ext/function');
Ember.require('ember-runtime/ext/string');

exports.Object = Ember.require('ember-runtime/system/object')['default'];
exports.computed = Ember.require('ember-metal/computed').computed;