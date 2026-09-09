import { createServer } from 'node:http'
import { createApp } from './app.js'
import { startBroadcasting, stopBroadcasting } from './simulation/broadcaster.js'
import { simulation } from './simulation/simulationEngine.js'
import { closeSocket, initialiseSocket } from './socket/index.js'
import { env } from './utils/env.js'
import { logger } from './utils/logger.js'

const app = createApp()
const httpServer = createServer(app)

const io = initialiseSocket(httpServer)

// The backend owns the authoritative simulation; clients render snapshots.
simulation.start()
startBroadcasting(io)

httpServer.listen(env.port, () => {
  logger.info(`AEROGUARD 3D backend listening on http://localhost:${env.port} (${env.nodeEnv})`)
  logger.info(`Health check: http://localhost:${env.port}/api/health`)
  logger.info(`Allowed client origin: ${env.clientUrl}`)
})

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down`)
  stopBroadcasting()
  simulation.stop()
  await closeSocket()
  httpServer.close(() => process.exit(0))
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
  })
}
