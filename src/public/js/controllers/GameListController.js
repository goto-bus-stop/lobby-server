define(function (require, exports, module) {

  module.exports = require('./IndexController').extend({
    layout: 'list'
  , renderPlayerList: false
  })

})