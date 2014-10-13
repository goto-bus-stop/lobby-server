define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:socket:subscription')


  module.exports = Ember.Object.extend({
    sock: null
  , channel: null
  , evts: []
  , subscribed: function () { debug('default subscribed callback') }
  , terminated: function () { debug('default termination callback') }

  , init: function () {
      debug('subscribing to ', this.get('channel'))
  //    this.get('sock').emit('subscribe', this.get('channel'), this.onSubscribed.bind(this))
    }
  , on: function (evt, cb) {
      debug('subscription ' + this.get('channel') + ' event', evt)
      this.get('evts').push([ evt, cb ])
      this.get('sock').on(this.get('channel') + ':' + evt, cb)
      return this
    }
  , off: function (evt, cb) {
      debug('subscription ' + this.get('channel') + ' event removal', evt)
      var evts = this.get('evts')
        , i = evts.length
      while (i--) {
        if (evts[i][0] === evt && (!cb || evts[i][1] === cb)) {
          evts.splice(i, 1)
        }
      }
      this.get('sock').off(this.get('channel') + ':' + evt, cb)
    }
  , onSubscribed: function () {
      debug('subscribed to ', this.get('channel'))
      var sub = this.get('subscribed')
      sub && sub()
    }
  , terminate: function (cb) {
      debug('subscription termination', this.get('channel'))
      var channel = this.get('channel')
        , sock = this.get('sock')
      this.get('evts').forEach(function (evt) {
        sock.off(channel + ':' + evt[0], evt[1])
      }, this)
      var term = this.get('terminated')
      term && term()
    }
  })

})