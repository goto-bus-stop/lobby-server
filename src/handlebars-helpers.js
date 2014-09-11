'use strict'

const fs = require('fs')
    , path = require('path')

module.exports = function (Handlebars) {

  Handlebars.registerHelper('json', function (o) {
    return new Handlebars.SafeString(JSON.stringify(o));
  })
  Handlebars.registerHelper('eq', function (a, b) { return a == b; });
  
  Handlebars.registerHelper('template', function (n) {
    return fs.readFileSync(path.join(__dirname, 'templates', n + '.handlebars'), { encoding: 'utf8' })
  })


}