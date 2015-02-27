'use strict'

const api = require('../api')
    , pp = require('passport')
    , fs = require('fs')
    , path = require('path')
    , Promise = require('bluebird')
    , glob = Promise.promisify(require('glob'))
    , store = require('../store')
    , express = require('express')
    , _ = require('lodash')

const { charAt, filter, map, replace, substring } = require('lambdajs')
const { partial, singleton } = require('../fn')

export default function () {

  let app = express.Router()

  function indexRoute(req, res) {
    if (req.isAuthenticated()) {
      let baseDir = path.join(__dirname, '../templates')
      let templates = glob(`${baseDir}{/**/*,*}.handlebars`)
        .filter(file => file.substr(file.lastIndexOf('/')).charAt(1) !== '@')
        .map(replace(/\.handlebars$/, ''))
        .map(substring(baseDir.length + 1))
      Promise.all([
        store.findAll('ladder')
      , store.findAll('server')
      , templates
      ]).spread((ladders, servers, templates) => {
        res.render('@layout', {
          content: '{{outlet}}',
          uid: req.session.uid,
          ladders: ladders,
          servers: servers,
          templates: templates
        })
      })
    }
    else {
      store.findAll('server').then(_.compose(partial(res.render.bind(res), [ '@login' ]), singleton('servers')))
    }
  }
  app.get('/', indexRoute)
  app.post('/', pp.authenticate('local'), (req, res) => {
    req.session.uid = req.session.passport.user
    res.redirect('/')
  })
  app.use('/auth', require('./auth')())

  app.get('/room/:room_id', indexRoute)
  app.get('/mods', indexRoute)
  app.get('/mods/:mod_id', indexRoute)
  app.get('/profile', indexRoute)
  app.get('/profile/:user_id', indexRoute)
  app.get('/ladders/:ladder_id', indexRoute)

  return app

}
