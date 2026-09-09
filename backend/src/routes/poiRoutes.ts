import { Router } from 'express'
import { getPois } from '../controllers/poiController.js'

export const poiRouter = Router()

poiRouter.get('/', getPois)
