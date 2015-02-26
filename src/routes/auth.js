'use strict'
const express = require('express')
    , pp = require('passport')

export default function () {

  let app = express.Router()

  const options = { failureRedirect: '/' }
  const authed = (req, res) => {
    req.session.uid = req.session.passport.user
    res.redirect('/')
  }

  app.post('/standard', pp.authenticate('local'), authed)
  app.get('/steam', pp.authenticate('steam'), () => {})
  app.get('/steam/return', pp.authenticate('steam'), authed)

  return app

}