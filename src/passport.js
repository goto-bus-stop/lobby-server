'use strict'

const api = require('./api')
    , bcrypt = require('bcryptjs')
    , LocalStrategy = require('passport-local').Strategy
    , debug = require('debug')('aocmulti:passport')
    , Promise = require('./promise')
    , fn = require('./fn')
    , store = require('./store')
    , userCache = require('lru-cache')({
        max: 200,
        maxAge: 1000 * 65
      })

const _authError = 'Username/Password combination not found'
const comparePassword = Promise.denodeify(bcrypt.compare)
const findUser = function (id) {
  const key = 'u' + id
  if (userCache.has(key)) {
    return Promise.resolve(userCache.get(key))
  }
  return store.find('user', id).then(isolate(function (user) {
    userCache.set(key, user)
  }))
}

module.exports = function (pp) {
  pp.serializeUser(function (user, done) { done(null, user.id) })
  pp.deserializeUser(function (id, done) { findUser(id).nodeify(done) })

  pp.use(new LocalStrategy(function (username, password, done) {
    store.query('user', { username: username })
      .then(function (user) {
        if (!user) {
          throw new Error(_authError)
        }
        debug('login', user)
        return comparePassword(password, user.password).then(constant(user))
      })
      .nodeify(done)
  }))
}
