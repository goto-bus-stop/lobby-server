'use strict'

const store = require('../store')
    , Promise = require('../promise')
    , readFile = Promise.denodeify(require('fs').readFile)
    , { join: joinPath } = require('path')
    , express = require('express')
    , _ = require('lodash')

const { singleton } = require('../fn')
const curry = require('curry')

const insertUser = store.insert('user')
const readCountries = () => readFile(joinPath(__dirname, '../../countries.json')).then(JSON.parse)
const renderTemplate = curry((res, tpl, locals) => res.render(tpl, locals))

export default function () {

  let app = express.Router()

  const countries = readCountries()

  const registerRoute = (req, res) => {
    countries
      .then(singleton('countries'))
      .then(renderTemplate(res, '@register'))
  }

  app.get('/register', registerRoute)

  return app

}