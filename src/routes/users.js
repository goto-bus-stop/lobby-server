'use strict'

import { Router } from 'express'
import db from '../knex'
import util from './util'
import { isEmpty, keys } from 'lodash'

const userColumns = [ 'id', 'username', 'country', 'status', 'roomId' ]

let app = Router()

app.get('/:user_id/ratings', function (req, res) {
  db('ratings').where('userId', req.params.user_id).select()

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find ratings', res))
})

app.get('/online', function (req, res) {
  api.getOnlineUsers(1)
    .then(users => ({ users }))
    .then(util.sideloadRatings)

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find users', res))
})

app.get('/me', function (req, res) {
  db('users').where('id', req.session.uid).select(userColumns)
    .then(user => ({ user }))
    .then(util.sideloadRatings)

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find user', res))
})

app.get('/:user_id', function (req, res) {
  let id = req.params.user_id

  db('users').where('id', id).select(userColumns)
    .then(api.addRatings)
    .then(user => ({ user }))

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find user', res))
})

app.get('/', function (req, res) {
  let query = req.query
  let find
  if (!isEmpty(query)) {
    if (keys(query).length === 1 && 'online' in query) {
      find = api.getOnlineUsers(1)
    }
    else {
      find = db('users').where(query).select(userColumns)
    }
  }
  else {
    find = db('users').select(userColumns)
  }

  find
    .then(api.addRatingsA)
    .then(users => ({ users }))

    .then(util.sendResponse(res))
    .catch(util.sendError(404, 'Could not find users', res))
})

export default app