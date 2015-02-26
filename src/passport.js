'use strict'

const api = require('./api')
    , bcrypt = require('bcryptjs')
    , util = require('util')
    , LocalStrategy = require('passport-local').Strategy
    , OpenIDStrategy = require('passport-openid').Strategy
    , SteamStrategy = require('./strategies/SteamStrategy')
    , debug = require('debug')('aocmulti:passport')
    , config = require('../config.json')
    , Promise = require('./promise')
    , fn = require('./fn')
    , store = require('./store')
    , userCache = require('lru-cache')({
        max: 200,
        maxAge: 1000 * 65
      })

const _authError = 'Username/Password combination not found'
const comparePassword = Promise.denodeify(bcrypt.compare)
const findUser = id => {
  const key = 'u' + id
  if (userCache.has(key)) {
    return Promise.resolve(userCache.get(key))
  }
  return store.find('user', id).then(isolate(user => {
    userCache.set(key, user)
  }))
}

export default function (pp) {
  pp.serializeUser((user, done) => { done(null, user.id) })
  pp.deserializeUser((id, done) => { findUser(id).nodeify(done) })

  pp.use(new LocalStrategy((username, password, done) => {
    store.query('user', { username: username })
      .then(user => {
        if (!user) {
          throw new Error(_authError)
        }
        debug('login', user)
        return comparePassword(password, user.password).then(constant(user))
      })
      .nodeify(done)
  }))

  if (config.auth.steam) {
    pp.use(new SteamStrategy(config.auth.steam, (openid, user, done) => {
      store.query('openid', { openid: openid })
        .then(compose(store.find('user'), pluck('userId')))
        .catch(e => {
          return store.insert('user', user)
            .then(newRecord => {
              return store.insert('openid', { userId: newRecord.id, openid: openid })
                .then(constant(newRecord))
            })
        })
        .nodeify(done)
    }))
  }
}
