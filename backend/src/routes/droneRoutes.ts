import { Router } from 'express'
import { getDroneByIdentifier, getDrones } from '../controllers/droneController.js'
import { chargeDrone, recallDrone } from '../controllers/simulationController.js'

export const droneRouter = Router()

droneRouter.get('/', getDrones)
droneRouter.get('/:id', getDroneByIdentifier)

// Operator fleet actions.
droneRouter.post('/:code/charge', chargeDrone)
droneRouter.post('/:code/recall', recallDrone)
