module.exports = require('ember').Controller.extend({
  layout: 'tabular'
, games: []
, gameData: {
    title: ''
  , descr: ''
  , maxPlayers: 8
  , ladder: 1
  }
, sendingRequest: false
, chatMessages: []
, renderPlayerList: true
})