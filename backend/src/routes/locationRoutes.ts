import { Router } from 'express'
import { getLocations } from '../controllers/locationController.js'

export const locationRouter = Router()

locationRouter.get('/', getLocations)
