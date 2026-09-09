import { Router } from 'express'
import { getZones } from '../controllers/zoneController.js'

export const zoneRouter = Router()

zoneRouter.get('/', getZones)
