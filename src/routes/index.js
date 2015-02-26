'use strict'

const api = require('../api')
    , pp = require('passport')
    , fs = require('fs')
    , path = require('path')
    , Promise = require('../promise')
    , glob = Promise.denodeify(require('glob'))
    , store = require('../store')
    , express = require('express')

export default function () {

  let app = express.Router()

  function indexRoute(req, res) {
    if (req.isAuthenticated()) {
      let baseDir = path.join(__dirname, '../templates')
      let templates = glob(`${baseDir}{/**/*,*}.handlebars`).then(
        compose(
          filter(compose(c => c !== '@', charAt(0))),
          map(compose(replace(/\.handlebars$/, ''), substring(baseDir.length + 1)))
        )
      )
      Promise.all([ store.findAll('ladder'), store.findAll('server'), templates ])
        .thenCombine((ladders, servers, templates) => {
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
      store.findAll('server').then(compose(partial(res.render.bind(res), [ '@login' ]), singleton('servers')))
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
