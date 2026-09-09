import { Router } from 'express'
import {
  clearSuspicious,
  getSimulationState,
  pauseSimulation,
  resetSimulation,
  resetTraffic,
  setSimulationSpeed,
  startSimulation,
  startTraffic,
  stopTraffic,
} from '../controllers/simulationController.js'

export const simulationRouter = Router()

simulationRouter.get('/', getSimulationState)
simulationRouter.post('/start', startSimulation)
simulationRouter.post('/pause', pauseSimulation)
simulationRouter.post('/reset', resetSimulation)
simulationRouter.post('/speed', setSimulationSpeed)
simulationRouter.post('/traffic/start', startTraffic)
simulationRouter.post('/traffic/stop', stopTraffic)
simulationRouter.post('/traffic/reset', resetTraffic)
simulationRouter.post('/suspicious/clear', clearSuspicious)
