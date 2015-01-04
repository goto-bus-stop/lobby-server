'use strict'

import us from 'lodash'
import lambdajs from 'lambdajs'

//+ Maybe :: a -> Maybe a
function Maybe(val) {
  if (!(this instanceof Maybe)) return new Maybe(val)
  this.val = val
}
Maybe.prototype.map = function (fn) {
  return this.val !== null ? Maybe(map(fn, this.val)) : Maybe(this.val)
}

//+ curry :: Function -> Function
import curry from 'curry'

//+ pluck :: String -> a -> b
const pluck = curry((prop, obj) => obj[prop])
//+ toInt :: a -> Number
const toInt = x => parseInt(x, 10)
//+ flip :: (a -> b -> c) -> (b -> a -> c)
const flip = f => curry((a, b) => f(b, a))
//+ merge :: Object -> Object -> Object
const merge = curry((a, b) => Object.assign({}, a, b))
//+ keys :: Object -> [String]
const keys = Object.keys
//+ renameProp :: String -> String -> Object -> Object
const renameProp = curry(function (from, to, obj) {
  return lambdajs.reduce(function (newObj, key) {
    newObj[key === from ? to : key] = obj[key]
    return newObj
  }, {}, keys(obj))
})
//+ partial :: (a -> b) -> [a] -> (a -> b)
const partial = curry(function (fn, args) {
  return (...args2) => fn(...args, ...args2)
})

export default merge({
  Maybe,

  curry,
  pluck,
  toInt,
  keys,
  flip,
  merge,
  renameProp,
  partial
}, lambdajs)

export function install(global) {
  for (let i in fn) if (fn.hasOwnProperty(i)) {
    global[i] = fn[i]
  }
}