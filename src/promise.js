'use strict'

const Promise = require('promise')

require('./fn').install(global)

export default Promise

/**
 * 
 */
Promise.prototype.catch = function (fn) {
  return this.then(null, fn)
}

/**
 * 
 */
Promise.prototype.finally = function (fn) {
  return this.then(isolate(fn), fn)
}

/**
 * 
 */
Promise.prototype.map = function (a, b, c) {
  return this.then(a, b, c)
}

/**
 * `then`s the value of this Promise into an array of functions, resolving to an array of their return values.
 *
 * @param {function()} functions Array of functions to apply to the resolved Promise.
 *
 * @return {Promise} Promise resolving to the results of the given functions.
 */
Promise.prototype.thenSplit = function (functions) {
  return this.then(function () {
    var args = arguments
    return Promise.all(functions.map(function (fn) {
      return fn.apply(null, args)
    }))
  })
}

/**
 * 
 */
Promise.prototype.thenCombine = function (cb) {
  return this.then(function (arr) { return cb.apply(this, arr) })
}