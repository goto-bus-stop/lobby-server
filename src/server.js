import express from 'express'
import IRCServer from 'ircs'

const debug = require('debug')('aocmulti:server')

let app = express()
let irc = IRCServer()

app.set('irc', irc)

import api from './routes'
app.use('/_', api)

app.listen(23649)
irc.listen(6667)