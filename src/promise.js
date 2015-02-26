'use strict'

const Promise = require('promise')

const { isolate } = require('./fn')

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
  return this.then(function (...args) {
    return Promise.all(functions.map(fn => fn(...args)))
  })
}

/**
 * 
 */
Promise.prototype.thenCombine = function (cb) {
  return this.then(arr => cb(...arr))
}