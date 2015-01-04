import knex from 'knex'
import { knex as config } from '../config.json'

export default knex(config)