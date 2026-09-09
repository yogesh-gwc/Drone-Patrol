import { Router } from 'express'
import { startSos, stopSos, triggerAmbulance } from '../controllers/simulationController.js'

export const emergencyRouter = Router()

/** All simulated. None of these contacts a real emergency service. */
emergencyRouter.post('/ambulance', triggerAmbulance)
emergencyRouter.post('/sos', startSos)
emergencyRouter.post('/sos/stop', stopSos)
