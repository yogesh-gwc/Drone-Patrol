import { Router } from 'express'
import { startVehicle, stopVehicle } from '../controllers/simulationController.js'
import { getVehicles } from '../controllers/vehicleController.js'

export const vehicleRouter = Router()

vehicleRouter.get('/', getVehicles)

// Phase 12 operator controls for the stopped-vehicle scenario.
vehicleRouter.post('/:code/stop', stopVehicle)
vehicleRouter.post('/:code/start', startVehicle)
