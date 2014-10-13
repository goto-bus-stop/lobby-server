const store = require('../store')
    , debug = require('debug')('aocmulti:GameRoom')

module.exports = GameRoom

function GameRoom() {
  if (!(this instanceof GameRoom)) return new GameRoom()
}