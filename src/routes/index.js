import { Router } from 'express'

let api = Router()

import rooms from './rooms'
api.use('/rooms', rooms)

import users from './users'
api.use('/users', users)

export default api