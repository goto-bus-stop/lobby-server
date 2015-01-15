import db from '../knex'
import { indexBy } from 'lodash'
import { merge, compose, curry, forEach, map, pluck, intoObj } from '../fn'

const debug = require('debug')('aocmulti:routes:api:util')

export function sideload(type, from, idProp) {
  return function (data) {
    let loadIds = data[from].reduce((a, item) => a.concat(item[idProp]), [])
    let models = data[`${type}s`] || []

    return db(`${type}s`).where('id', loadIds).select()
      .tap(sideloaded => { data[`${type}s`] = models.concat(sideloaded) })
      .return(data)
  }
}

export function sideloadPlayers(data) {
  let rooms = data.rooms || [ data.room ]

  for (let room of rooms) {
    room.players = room.players || []
  }
  debug('rooms', rooms, { roomId: map(pluck('id'), rooms) })

  let roomsById = indexBy(rooms, 'id')
  debug('byId', roomsById)
  return db('users').where('roomId', map(pluck('id'), rooms)).select()
    .tap(debug.bind(null, 'sideloaded'))
    .tap(forEach(player => {
      roomsById[player.roomId].players.push(player.id)
    }))
    .then(compose( merge(data), intoObj('users') ))
}

export function sideloadRatings(data) {
  let players = data.users || [ data.user ]

  for (let player of players) {
    player.ratings = player.ratings || []
  }

  let playersById = indexBy(players, 'id')
  return db('ratings').where('userId', map(pluck('id'), players)).select()
    .tap(forEach(rating => {
      playersById[rating.userId].ratings.push(rating.id)
    }))
    .then(compose( merge(data), intoObj('ratings') ))
}

export const sideloadByMany = curry(function (type, sideProp, dataProp, data) {
  return store.queryMany(type, { [sideProp]: map(pluck('id'), models) })
    .then(sideloaded => {
      sideloaded.forEach(side => {
        modelsById[side[sideProp]]
      })
      data[`${type}s`] = sideloaded
      return data
    })
    .catch(debug)
})

export function sendError(code, msg, res) {
  return function (error) {
    res.writeHead(code, { 'Content-type': 'application/json' })
    res.end(JSON.stringify({ type: 'error', error, msg }))
  }
}

export function sendResponse(res) {
  return function (obj) {
    res.writeHead(200, { 'Content-type': 'application/json' })
    res.end(JSON.stringify(obj, null, '  '))
  }
}
