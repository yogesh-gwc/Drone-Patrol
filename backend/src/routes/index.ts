import { Router } from 'express'
import { chargingStationRouter } from './chargingStationRoutes.js'
import { dashboardRouter } from './dashboardRoutes.js'
import { droneRouter } from './droneRoutes.js'
import { emergencyRouter } from './emergencyRoutes.js'
import { healthRouter } from './healthRoutes.js'
import { locationRouter } from './locationRoutes.js'
import { poiRouter } from './poiRoutes.js'
import { routeRouter } from './routeRoutes.js'
import { simulationRouter } from './simulationRoutes.js'
import { vehicleRouter } from './vehicleRoutes.js'
import { zoneRouter } from './zoneRoutes.js'

/**
 * Root router for everything mounted under `/api`.
 *
 * Phase 2 exposes read-only resources. Simulation and emergency mutation
 * endpoints are added in later phases.
 */
export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/drones', droneRouter)
apiRouter.use('/zones', zoneRouter)
apiRouter.use('/routes', routeRouter)
apiRouter.use('/charging-stations', chargingStationRouter)
apiRouter.use('/locations', locationRouter)
apiRouter.use('/pois', poiRouter)
apiRouter.use('/vehicles', vehicleRouter)
apiRouter.use('/simulation', simulationRouter)
apiRouter.use('/emergency', emergencyRouter)
apiRouter.use('/dashboard', dashboardRouter)
