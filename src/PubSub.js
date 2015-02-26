'use strict'

const debug = require('debug')('aocmulti:pubsub')

/**
 * Super-simple Publish/Subscribe!
 * @constructor
 */
function PubSub() {
  /**
   * Event storage map
   * @type {Object.<string, function(*)>}
   */
  this.$events = {}
}

/**
 * Add a listener function to be executed on `evt`
 * @param {string} evt Event name.
 * @param {function(*)} fn Handler to be added.
 * @return {Evts}
 */
PubSub.prototype.subscribe = function (evt, fn) {
  (this.$events[evt] = this.$events[evt] || []).push(fn)
  return this
}

/**
 * Add a listener function to be executed on `evt`, but only once; ie. remove
 * again after the first event.
 * @param {string} evt Event name.
 * @param {function(*)} fn Handler.
 * @return {Evts}
 */
PubSub.prototype.once = function (evt, fn) {
  const self = this
  return self.subscribe(evt, function onceFn() {
    fn.apply(this, arguments)
    self.unsubscribe(evt, onceFn)
  })
}

/**
 * Remove an event listener.
 * @param {string} evt Event name.
 * @param {function(*)} fn Handler that should be removed.
 * @return {Evts}
 */
PubSub.prototype.unsubscribe = function (evt, fn) {
  if (this.$events[evt]) {
    var i = this.$events[evt].indexOf(fn)
    this.$events[evt].splice(i, 1)
  }
  return this
}

/**
 * Emit/trigger an event.
 * @param {string} evt Event name.
 * @param {...*} args Arguments to pass to the event handler.
 * @return {Evts}
 */
PubSub.prototype.publish = function (evt, args) {
  const e = this.$events && this.$events[evt]
  debug('publishing ' + evt, args)
  if (e) {
    args = [].slice.call(arguments, 1)
    process.nextTick(function () {
      for (let i = 0, l = e.length; i < l; i++) {
        e[i].apply(this, args)
      }
    }.bind(this))
  }
  else {
    debug('no events on ' + evt)
  }
  return this
}

export default new PubSub()