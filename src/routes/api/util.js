'use strict'

const store = require('../../store')
    , debug = require('debug')('aocmulti:routes:api:util')
    , _ = require('lodash')

export function sideload(type, from, prop) {
  return function (data) {
    var loadIds = data[from].reduce(function (a, item) {
      return a.concat(item[prop])
    }, [])
    return store.findMany(type, loadIds).then(function (sideloaded) {
      data[type + 's'] = data[type + 's'] ? data[type + 's'].concat(sideloaded) : sideloaded
      return data
    })
  }
}

export function sideloadPlayers(data) {
  let rooms = data.rooms || [ data.room ]
  rooms.forEach(function (room) {
    if (!room.players) {
      room.players = []
    }
  })
  debug('rooms', rooms, { roomId: map(pluck('id'), rooms) })
  let roomsById = _.indexBy(rooms, 'id')
  debug('byId', roomsById)
  return store.queryMany('user', { roomId: map(pluck('id'), rooms) })
    .then(isolate(debug.bind(null, 'sideloaded')))
    .then(compose(
      merge(data),
      singleton('users'),
      isolate(forEach(function (player) { roomsById[player.roomId].players.push(player.id) }))
    ))
    .catch(debug.bind(null, 'sideloadPlayers'))
}

export const sideloadByMany = curry(function (type, sideProp, dataProp, data) {

  return store.queryMany(type, singleton(sideProp, map(pluck('id'), models)))
    .then(function (sideloaded) {
      sideloaded.forEach(function (side) {
        modelsById[side[sideProp]]
      })
      data[type + 's'] = sideloaded
      return data
    })
    .catch(debug)
})

export function sendError(code, msg, res) {
  return function (err) {
    res.writeHead(code, { 'Content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error: err, msg: msg }))
  }
}

export function sendResponse(res) {
  return function (obj) {
    res.writeHead(200, { 'Content-type': 'application/json' })
    res.end(JSON.stringify(obj, null, '  '))
  }
}
