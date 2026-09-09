import type { Request, Response } from 'express'
import { simulation } from '../simulation/simulationEngine.js'
import type { SimulationSnapshot } from '../simulation/types.js'
import type { ApiResponse } from '../types/api.js'
import { sendItem } from '../utils/apiResponse.js'
import { ValidationError } from '../utils/errors.js'

type SnapshotResponse = Response<ApiResponse<SimulationSnapshot>>

export function getSimulationState(_req: Request, res: SnapshotResponse): void {
  sendItem(res, simulation.snapshot(), 'Simulation state')
}

export function startSimulation(_req: Request, res: SnapshotResponse): void {
  simulation.start()
  sendItem(res, simulation.snapshot(), 'Simulation started')
}

export function pauseSimulation(_req: Request, res: SnapshotResponse): void {
  simulation.pause()
  sendItem(res, simulation.snapshot(), 'Simulation paused')
}

export function resetSimulation(_req: Request, res: SnapshotResponse): void {
  simulation.reset()
  sendItem(res, simulation.snapshot(), 'Simulation reset')
}

export function setSimulationSpeed(req: Request, res: SnapshotResponse): void {
  const raw: unknown = (req.body as Record<string, unknown> | undefined)?.speed
  const speed = Number(raw)
  if (![1, 5, 10, 60].includes(speed)) {
    throw new ValidationError('speed must be one of 1, 5, 10, 60')
  }
  simulation.setSpeed(speed)
  sendItem(res, simulation.snapshot(), 'Simulation speed updated')
}

export function startTraffic(_req: Request, res: SnapshotResponse): void {
  simulation.startTraffic()
  sendItem(res, simulation.snapshot(), 'Traffic started')
}

export function stopTraffic(_req: Request, res: SnapshotResponse): void {
  simulation.stopTraffic()
  sendItem(res, simulation.snapshot(), 'Traffic stopped')
}

export function resetTraffic(_req: Request, res: SnapshotResponse): void {
  simulation.resetTraffic()
  sendItem(res, simulation.snapshot(), 'Traffic reset')
}

/**
 * Triggers the simulated ambulance priority corridor.
 *
 * SIMULATION ONLY: no emergency service is contacted and no real dispatch of
 * any kind occurs.
 */
export function triggerAmbulance(_req: Request, res: SnapshotResponse): void {
  simulation.triggerAmbulance()
  sendItem(res, simulation.snapshot(), 'Simulated ambulance priority corridor activated')
}

/**
 * Starts a simulated SOS at an operator-supplied latitude and longitude.
 *
 * SIMULATION ONLY: nobody is contacted and no responder is dispatched.
 */
export function startSos(req: Request, res: SnapshotResponse): void {
  const body = (req.body ?? {}) as Record<string, unknown>
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ValidationError('latitude and longitude are required and must be numbers')
  }
  if (latitude < -90 || latitude > 90) {
    throw new ValidationError('latitude must be between -90 and 90')
  }
  if (longitude < -180 || longitude > 180) {
    throw new ValidationError('longitude must be between -180 and 180')
  }

  const result = simulation.startSos([longitude, latitude])
  if ('error' in result) {
    throw new ValidationError(result.error)
  }
  sendItem(res, simulation.snapshot(), 'Simulated SOS activated')
}

/** Sends one drone to a charging pad, chosen by the operator. */
export function chargeDrone(req: Request, res: SnapshotResponse): void {
  const code = parseDroneCode(req.params.code)
  const result = simulation.sendDroneToCharge(code)
  if ('error' in result) {
    throw new ValidationError(result.error)
  }
  sendItem(res, simulation.snapshot(), `${code} routed to a charging pad`)
}

/** Returns a drone to patrol, whether charging or on an assignment. */
export function recallDrone(req: Request, res: SnapshotResponse): void {
  const code = parseDroneCode(req.params.code)
  const result = simulation.recallDrone(code)
  if ('error' in result) {
    throw new ValidationError(result.error)
  }
  sendItem(res, simulation.snapshot(), `${code} returning to patrol`)
}

/** Parks a vehicle on the NH-44 shoulder and starts its stationary timer. */
export function stopVehicle(req: Request, res: SnapshotResponse): void {
  const code = parseVehicleCode(req.params.code)
  const result = simulation.stopVehicle(code)
  if ('error' in result) {
    throw new ValidationError(result.error)
  }
  sendItem(res, simulation.snapshot(), `${code} stopped on NH-44`)
}

/** Restarts a stopped vehicle and clears any incident against it. */
export function startVehicle(req: Request, res: SnapshotResponse): void {
  const code = parseVehicleCode(req.params.code)
  const result = simulation.startVehicle(code)
  if ('error' in result) {
    throw new ValidationError(result.error)
  }
  sendItem(res, simulation.snapshot(), `${code} moving again`)
}

/** Resolves the active stopped-vehicle incident. */
export function clearSuspicious(_req: Request, res: SnapshotResponse): void {
  simulation.clearSuspicious()
  sendItem(res, simulation.snapshot(), 'Suspicious vehicle incident cleared')
}

function parseVehicleCode(raw: unknown): string {
  if (typeof raw !== 'string' || !/^(VH|AMB)-\d{1,4}$/i.test(raw.trim())) {
    throw new ValidationError('Vehicle code must look like VH-023')
  }
  return raw.trim().toUpperCase()
}

function parseDroneCode(raw: unknown): string {
  if (typeof raw !== 'string' || !/^DR-\d{2}$/i.test(raw.trim())) {
    throw new ValidationError('Drone code must look like DR-01')
  }
  return raw.trim().toUpperCase()
}

export function stopSos(_req: Request, res: SnapshotResponse): void {
  simulation.stopSos()
  sendItem(res, simulation.snapshot(), 'SOS resolved; drone returning to patrol')
}

/** Spawns a high-speed vehicle (~135 km/h) heading toward the nearest drone. */
export function triggerOverspeedVehicle(_req: Request, res: SnapshotResponse): void {
  simulation.triggerOverspeedVehicle()
  sendItem(res, simulation.snapshot(), 'Overspeeding test vehicle dispatched')
}

/** Retrieves all recorded speed violations from local JSON file. */
export async function getViolations(_req: Request, res: Response): Promise<void> {
  const list = await simulation.getViolations()
  sendItem(res, list, `${list.length} speed violations recorded`)
}
