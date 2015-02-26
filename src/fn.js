'use strict'

export function Maybe(val) {
  if (!(this instanceof Maybe)) return new Maybe(val)
  this.val = val
}
Maybe.prototype.map = function (fn) {
  return this.val !== null ? Maybe(map(fn, this.val)) : Maybe(this.val)
}

export function Mappable(val) {
  if (!(this instanceof Mappable)) return new Mappable(val)
  this.val = val
}
Mappable.prototype.map = function (fn) {
  return this.val.map ? map(fn, this.val) : fn(this.val)
}

const curry = require('curry')
const pluck = require('propprop')
const { reduce, map } = require('lambdajs')

//+ toInt :: a -> Number
export const toInt = x => parseInt(x, 10)
//+ toJSON :: a -> Object
export const toJSON = o => o.toJSON()
//+ mapAny :: (a -> b) -> [a]|a -> [b]|b
export const mapAny = curry((fn, a) => a.map ? map(fn, a) : fn(a))
//+ ident :: _ -> a -> a
export function ident() { return a => a }
//+ constant :: a -> _ -> a
export const constant = function (a) { return () => a }
//+ flip :: (a -> b -> c) -> (b -> a -> c)
export const flip = function (f) { return curry((a, b) => f(b, a)) }
//+ values :: Object -> [a]
export const values = function (obj) { return map(flip(pluck)(obj), Object.keys(obj)) }
//+ isIn :: [a] -> a -> Boolean
export const isIn = curry((arr, x) => arr.indexOf(x) > -1)
//+ subset :: [String] -> Object -> Object
export const subset = curry((sub, obj) => {
  return reduce((newObj, key) => { newObj[key] = obj[key]; return newObj }, {}, sub)
})
//+ without :: String -> Object -> Object
export const without = curry(function (prop, obj) {
  return reduce((newObj, key) => {
    if (key !== prop) newObj[key] = obj[key];
    return newObj
  }, {}, Object.keys(obj))
})
//+ renameProp :: String -> String -> Object -> Object
export const renameProp = curry(function (from, to, obj) {
   return reduce((newObj, key) => {
     newObj[key === from ? to : key] = obj[key];
     return newObj
   }, {}, Object.keys(obj))
})
//+ partial :: (a -> b) -> [a] -> (a -> b)
export const partial = curry(function (fn, args) {
  return (...args2) => fn(...args, ...args2)
})
//+ singleton :: String -> _ -> Object
export const singleton = curry(function (k, v) { return { [k]: v } })
//+ isolate :: (a -> _) -> b -> (a -> b)
export const isolate = curry(function (fn, x) {
  fn(x)
  return x
})
//+ append :: [a] -> [a] -> [a]
export const append = curry(function (suffix, arr) {
  return arr.concat(suffix)
})
//+ associate :: [String] -> [a] -> ?
export const associate = curry(function (keys, values) {
  return reduce((obj, key, i) => {
    obj[key] = values[i]
    return obj
  }, {}, keys)
})