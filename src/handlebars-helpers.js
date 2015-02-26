'use strict'

const { readFileSync } = require('fs')
    , { join } = require('path')

export default function (Handlebars) {

  Handlebars.registerHelper('json', o => {
    return new Handlebars.SafeString(JSON.stringify(o))
  })
  Handlebars.registerHelper('eq', (a, b) => a == b)

  Handlebars.registerHelper('template', n => {
    return readFileSync(join(__dirname, 'templates', `${n}.handlebars`), { encoding: 'utf8' })
  })


}