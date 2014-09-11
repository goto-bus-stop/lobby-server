'use strict'

const fs = require('fs')
    , path = require('path')

    , Promise = require('../promise')
    , fn = require('../fn')

const readFile = Promise.denodeify(fs.readFile)

const fnIo = {
  readFile: readFile
}

module.exports = fnIo
module.exports.install = function (global) {
  for (let i in fnIo) if (fnIo.hasOwnProperty(i)) {
    global[i] = fnIo[i]
  }
}