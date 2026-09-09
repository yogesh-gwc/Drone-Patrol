import { Router } from 'express'
import { getChargingStations } from '../controllers/chargingStationController.js'

export const chargingStationRouter = Router()

chargingStationRouter.get('/', getChargingStations)
