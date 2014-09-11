'use strict'

const sql = require('../sql')
    , fn = require('../fn')
    , PubSub = require('../PubSub')
    , debug = require('debug')('aocmulti:client-api')
    , express = require('express')
    , Struct = require('awestruct')
    , fs = require('fs')

const USEP = '\x1F'

module.exports = function () {
  
  let app = express.Router()
  
  app.use(function (req, res, next) {
    debug(req.url)
    next()
  })

  app.get('/game/:seskey', function (req, res) {
    var format = req.query.format || 'json';
    sql.query(
      'SELECT u.username, r.ip, r.maxPlayers, (r.hostId = u.id) AS isHost, r.sessGuid AS sguid, r.guid ' +
      'FROM sessions s, users u, gameRooms r ' +
      'WHERE s.seskey = ? AND u.id = s.userId AND r.id = s.roomId',
      [ req.params.seskey ]
    ).then(dot(0)).then(function (session) {
      if (format === 'json') {
        res.json(session)
      }
      else if (format === 'cl') {
        res.send([
          session.isHost
        , session.ip
        , session.username
        , session.maxPlayers
        , session.sguid
        , session.guid
        ].join(USEP))
      }
    })
    .catch(function (e) {
      debug(e.stack)
    })
  })

  app.post('/game/:seskey/ready', function (req, res) {
    if (req.body.sguid && req.body.guid) {
      store.query('gameSession', { seskey: req.params.seskey }, [ 'roomId' ])
        .then(function (x) {
          PubSub.publish('gameRoom:starting', x.roomId)
          return store.update('room', { id: x.roomId }, { ip: req.ip, sessGuid: req.body.sguid, guid: req.body.guid })
        })
        .then(next)
        .catch(function (e) {
          debug(e.stack)
        })
    }
    else {
      next()
    }
    function next(a) {
      const format = req.query.format || 'json'
      
      store.update('gameSession', { seskey: req.params.seskey }, { status: 'ready' })

      store.query('gameSession', { seskey: req.params.seskey }, [ 'playerId', 'roomId' ])
        .then(function (r) {
          PubSub.publish('player-ready', r.playerId, r.roomId);

          if (format === 'json') res.json(true)
          else if (format === 'cl') res.send('1')
        })
        .catch(function () {
          if (format === 'json') res.json(false)
          else if (format === 'cl') res.send('0')
        })
    }
  })

	const gameStatsStruct = Struct({
		u1: Struct.array(44, 'uint8'),
		scenarioName: Struct.char(32),
		u2: Struct.array(4, 'uint8'),
		duration: 'uint32',
		cheatsEnabled: 'bool',
		complete: 'uint8',
		u3: Struct.array(14, 'uint8'),
		mapSize: 'uint8',
		map: 'uint8',
		pop: 'uint8',
		u4: 'uint8',
		victory: 'uint8',
		startAge: 'uint8',
		resources: 'uint8',
		allTech: 'bool',
		teamTogether: 'bool',
		revealMap: 'uint8',
		u5: Struct.array(3, 'uint8'),
		lockTeams: 'bool',
		lockSpeed: 'bool',
		u6: 'int8',
		playerStats: Struct.array(8, Struct({
			name: Struct.char(16),
			totalScore: 'uint16',
			totalScores: Struct.array(8, 'uint16'),
			u0: 'uint8',
			civilization: 'uint8',
			index: 'uint8',
			team: 'uint8',
			u1: Struct.array(2, 'uint8'),
			mvp: 'bool',
			u2: Struct.array(3, 'uint8'),
			result: 'uint8',
			u3: Struct.array(3, 'uint8'),
			militaryStats: Struct({
				militaryScore: 'uint16',
				kills: 'uint16',
				u1: 'uint16',
				unitsLost: 'uint16',
				razes: 'uint16',
				u2: 'uint16',
				buildingsLost: 'uint16',
				conversions: 'uint16'
			}),
			u4: Struct.array(32, 'uint8'),
			economyStats: Struct({
				economyScore: 'uint16',
				u1: 'uint16',
				foodCollected: 'uint32',
				woodCollected: 'uint32',
				stoneCollected: 'uint32',
				goldCollected: 'uint32',
				tributeSent: 'uint16',
				tributeRcvd: 'uint16',
				tradeProfit: 'uint16',
				relicGold: 'uint16'
			}),
			u5: Struct.array(16, 'uint8'),
			technologyStats: Struct({
				technologyScore: 'uint16',
				u1: 'uint16',
				feudalAge: 'uint32',
				castleAge: 'uint32',
				imperialAge: 'uint32',
				mapExplored: 'uint8',
				researchCount: 'uint8',
				researchPercent: 'uint8'
			}),
			u6: 'int8',
			societyStats: Struct({
				societyScore: 'uint16',
				totalWonders: 'uint8',
				totalCastles: 'uint8',
				relicsCaptured: 'uint8',
				u1: 'uint8',
				villagerHigh: 'uint16'
			}),
			u7: Struct.array(84, 'uint8')
		})),
		playerIndex: 'uint8',
		u7: Struct.array(7, 'uint8')
	})
  app.post('/game/:seskey/end', function (req, res) {
    var data = new Buffer(2140)
		  , offset = 0
		req.on('data', function (c) {
			c.copy(data, offset)
			offset += c.length
		})
		req.on('end', function () {
			console.log(gameStatsStruct(data))
		})
  })

  app.post('/game/:seskey/recording', function (req, res) {
    req
			.pipe(zlib.createGzip())
		  .pipe(fs.createWriteStream(path.join('recordings', req.params.seskey + '.zip')))
		req.on('end', res.end.bind(res, 'ok'))
  })

  return app

}
