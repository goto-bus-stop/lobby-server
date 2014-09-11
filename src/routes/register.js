'use strict'

const store = require('../store')
    , Promise = require('../promise')
    , fs = require('fs')
    , path = require('path')
    , express = require('express')

require('../fn').install(global)
require('../fn/io').install(global)

const insertUser = store.insert('user')
const joinPath = path.join
const readCountries = compose(await(JSON.parse),
                              partial(readFile, [ joinPath(__dirname, '../../countries.json') ]))
const renderTemplate = curry(function (res, tpl, locals) { return res.render(tpl, locals) })

module.exports = function () {

  let app = express.Router()

  const countries = readCountries()
  
  const registerRoute = function (req, res) {
    await(compose(renderTemplate(res, '@register'), singleton('countries')), countries)
  }
  
  app.get('/register', registerRoute)
  
  return app

}