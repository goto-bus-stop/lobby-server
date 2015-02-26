'use strict'

const express = require('express')
    , api = require('../../api')
    , store = require('../../store')
    , _ = require('lodash')
    , util = require('./util')

const userColumns = [ 'id', 'username', 'country', 'status', 'roomId' ]
const cleanUserRecord = subset(userColumns)

module.exports = function () {

  let app = express.Router()

  app.get('/:user_id/ratings', function (req, res) {
    store.queryMany('rating', { userId: req.params.user_id })
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find ratings', res))
  })
  app.get('/online', function (req, res) {
    api.getOnlineUsers(1)
      .then(map(cleanUserRecord))
      .then(api.addRatingsA)
      .then(singleton('users'))
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find users', res))
  })
  app.get('/me', function (req, res) {
    store.find('user', req.session.uid, userColumns)
      .then(cleanUserRecord)
      .then(api.addRatings)
      .then(singleton('user'))
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find user', res))
  })
  app.get('/:user_id', function (req, res) {
    const id = req.params.user_id

    store.find('user', id, userColumns)
      .then(cleanUserRecord)
      .then(api.addRatings)
      .then(singleton('user'))
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find user', res))
  })
  app.get('/', function (req, res) {
    const query = req.query
    let find
    if (!_.isEmpty(query)) {
      if (Object.keys(query).length === 1 && 'online' in query) {
        find = api.getOnlineUsers(1)
      }
      else {
        find = store.queryMany('user', query, userColumns)
      }
    }
    else {
      find = store.findAll('user', userColumns)
    }
    find
      .then(map(cleanUserRecord))
      .then(api.addRatingsA)
      .then(singleton('users'))
      .then(util.sendResponse(res))
      .catch(util.sendError(404, 'Could not find users', res))
  })

  return app

}