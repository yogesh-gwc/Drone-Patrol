import { Router } from 'express'
import { getRoutes } from '../controllers/routeController.js'

export const routeRouter = Router()

routeRouter.get('/', getRoutes)
