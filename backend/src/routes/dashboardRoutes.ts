import { Router } from 'express'
import { getDashboard } from '../controllers/dashboardController.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', getDashboard)
