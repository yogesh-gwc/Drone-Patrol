import cors from 'cors'
import express, { type Express } from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { apiRouter } from './routes/index.js'
import { env } from './utils/env.js'

/** Builds the Express application with its middleware and API routes. */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: env.clientUrl }))
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
