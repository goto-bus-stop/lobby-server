'use strict'

const us = require('lodash')
    , lambdajs = require('lambdajs')

const Maybe = function (val) {
  if (!(this instanceof Maybe)) return new Maybe(val)
  this.val = val
}
Maybe.prototype.map = function (fn) {
  return this.val !== null ? Maybe(map(fn, this.val)) : Maybe(this.val)
}

const Mappable = function (val) {
  if (!(this instanceof Mappable)) return new Mappable(val)
  this.val = val
}
Mappable.prototype.map = function (fn) {
  return this.val.map ? map(fn, this.val) : fn(this.val)
}

//+ curry :: Function -> Function
const curry = require('curry')
Function.prototype.curry = function (x) { return x ? curry.to(x, this) : curry(this) }

//+ pluck :: String -> a -> b
const pluck = curry(function (prop, obj) { return obj[prop] })
//+ toInt :: a -> Number
const toInt = function (x) { return parseInt(x, 10) }
//+ toArray :: a -> [b]
const toArray = us.toArray
//+ toJSON :: a -> Object
const toJSON = function (o) { return o.toJSON() }
//+ await :: (a -> b) -> [a] -> [b]
const await = curry(function (fn, subj) { return subj.then(fn) })
//+ mapAny :: (a -> b) -> [a]|a -> [b]|b
const mapAny = curry(function (fn, a) { return a.map ? map(fn, a) : fn(a) })
//+ ident :: _ -> a -> a
const ident = function () { return function (a) { return a } }
//+ constant :: a -> _ -> a
const constant = function (a) { return function () { return a } }
//+ flip :: (a -> b -> c) -> (b -> a -> c)
const flip = function (f) { return curry(function (a, b) { return f(b, a) }) }
//+ merge :: Object -> Object -> Object
const merge = curry(function (a, b) {
  let result = {}
  lambdajs.forEach(function (key) { result[key] = a[key] }, keys(a))
  lambdajs.forEach(function (key) { result[key] = b[key] }, keys(b))
  return result
})
//+ keys :: Object -> [String]
const keys = Object.keys
//+ values :: Object -> [a]
const values = function (obj) { return map(flip(pluck)(obj), keys(obj)) }
//+ isIn :: [a] -> a -> Boolean
const isIn = curry(function (arr, x) { return arr.indexOf(x) > -1 })
//+ subset :: [String] -> Object -> Object
const subset = curry(function (sub, obj) { return reduce(function (newObj, key) { newObj[key] = obj[key]; return newObj }, {}, sub) })
//+ without :: String -> Object -> Object
const without = curry(function (prop, obj) {
  return reduce(function (newObj, key) { if (key !== prop) newObj[key] = obj[key]; return newObj }, {}, keys(obj))
})
//+ renameProp :: String -> String -> Object -> Object
const renameProp = curry(function (from, to, obj) {
   return reduce(function (newObj, key) { newObj[key === from ? to : key] = obj[key]; return newObj }, {}, keys(obj))
})
//+ partial :: (a -> b) -> [a] -> (a -> b)
const partial = curry(function (fn, args) {
  const self = this
  return function () { return fn.apply(self, concat(toArray(args), toArray(arguments))) }
})
//+ singleton :: String -> _ -> Object
const singleton = curry(function (k, v) { let o = {}; return o[k] = v, o })
//+ isolate :: (a -> _) -> (a -> a)
const isolate = function (fn) { return function (x) { fn(x); return x } }
//+ append :: [a] -> [a] -> [a]
const append = curry(function (suffix, arr) { return arr.concat(suffix) })
//+ associate :: [String] -> [a]
const associate = curry(function (keys, values) {
  return reduce(function (obj, key, i) { obj[key] = values[i]; return obj }, {}, keys)
})

const fn = merge({
  Maybe: Maybe,
  Mappable: Mappable,
  
  curry: curry,
  pluck: pluck,
  toInt: toInt,
  toArray: toArray,
  toJSON: toJSON,
  await: await,
  mapAny: mapAny,
  ident: ident,
  keys: keys,
  values: values,
  constant: constant,
  flip: flip,
  merge: merge,
  subset: subset,
  without: without,
  renameProp: renameProp,
  partial: partial,
  singleton: singleton,
  isolate: isolate,
  append: append,
  associate: associate
}, lambdajs)

module.exports = us.clone(fn)
module.exports.install = function (global) {
  for (let i in fn) if (fn.hasOwnProperty(i)) {
    global[i] = fn[i]
  }
}