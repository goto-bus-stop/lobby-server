'use strict'

const store = require('../store')
    , Promise = require('../promise')
    , fs = require('fs')
    , { join: joinPath } = require('path')
    , express = require('express')
    , curry = require('curry')

require('../fn').install(global)
require('../fn/io').install(global)

const insertUser = store.insert('user')
const readCountries = compose(await(JSON.parse),
                              partial(readFile, [ joinPath(__dirname, '../../countries.json') ]))
const renderTemplate = curry((res, tpl, locals) => res.render(tpl, locals))

export default function () {

  let app = express.Router()

  const countries = readCountries()

  const registerRoute = (req, res) => {
    await(compose(renderTemplate(res, '@register'), singleton('countries')), countries)
  }

  app.get('/register', registerRoute)

  return app

}