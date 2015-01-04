import express from 'express'

const debug = require('debug')('aocmulti:server')

let app = express()

import api from './routes'
app.use('/_', api)

app.listen(23649)