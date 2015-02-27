'use strict'

const store = require('../store')
    , Promise = require('bluebird')
    , readFile = Promise.promisify(require('fs').readFile)
    , { join: joinPath } = require('path')
    , express = require('express')
    , _ = require('lodash')

const curry = require('curry')

const insertUser = store.insert('user')
const readCountries = () => readFile(joinPath(__dirname, '../../countries.json')).then(JSON.parse)
const renderTemplate = curry((res, tpl, locals) => res.render(tpl, locals))

export default function () {

  let app = express.Router()

  const countriesP = readCountries()

  const registerRoute = (req, res) => {
    countriesP.then(
      countries => res.render('@register', { countries: countries }),
      err => res.send(err)
    )
  }

  app.get('/register', registerRoute)

  return app

}