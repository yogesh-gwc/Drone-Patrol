import type { Request, Response } from 'express'
import {
  approveRecommendation,
  approveRelayRecommendation,
  evaluateDroneAssignment,
  fetchAgentState,
  fetchAuditLog,
  rejectRecommendation,
  rejectRelayRecommendation,
  updateAgentConfig,
} from '../agents/agentClient.js'
import { simulation } from '../simulation/simulationEngine.js'

export async function getAgentState(_req: Request, res: Response): Promise<void> {
  try {
    const state = await fetchAgentState()
    res.json({ success: true, message: 'Agent state retrieved', data: state })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Internal error' })
  }
}

export async function handleApproveRecommendation(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ success: false, message: 'Missing recommendation id' })
    return
  }
  try {
    const result = await approveRecommendation(id)
    res.json({ success: true, message: `Recommendation ${id} approved`, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Approval failed' })
  }
}

export async function handleRejectRecommendation(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ success: false, message: 'Missing recommendation id' })
    return
  }
  try {
    const result = await rejectRecommendation(id)
    res.json({ success: true, message: `Recommendation ${id} rejected`, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Rejection failed' })
  }
}

export async function handleEvaluateDrone(req: Request, res: Response): Promise<void> {
  try {
    const simState = simulation.snapshot()
    const payload = {
      target_type: req.body.targetType || req.body.target_type || 'MANUAL',
      target_id: req.body.targetId || req.body.target_id || 'OPERATOR_TARGET',
      target_position: req.body.targetPosition || req.body.target_position || [77.925, 12.658],
      target_zone: req.body.targetZone || req.body.target_zone,
      drones: req.body.drones && req.body.drones.length > 0 ? req.body.drones : simState.drones,
    }
    const result = await evaluateDroneAssignment(payload)
    res.json({ success: true, message: 'Drone evaluation completed', data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Evaluation failed' })
  }
}

export async function handleGetAudit(_req: Request, res: Response): Promise<void> {
  try {
    const log = await fetchAuditLog()
    res.json({ success: true, message: 'Audit log retrieved', data: log })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get audit log' })
  }
}

export async function handleUpdateConfig(req: Request, res: Response): Promise<void> {
  try {
    const result = await updateAgentConfig(req.body)
    res.json({ success: true, message: 'Agent configuration updated', data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Config update failed' })
  }
}

/**
 * Endpoint called by the Python AI service when an approved recommendation executes.
 */
export async function handleAssignDrone(req: Request, res: Response): Promise<void> {
  const { droneCode, mode, targetPosition, targetEntityCode } = req.body
  if (!droneCode || !mode || !targetPosition) {
    res.status(400).json({ success: false, message: 'Missing required assignment fields' })
    return
  }
  const ok = simulation.assignDroneMission(droneCode, mode, targetPosition, targetEntityCode)
  if (!ok) {
    res.status(404).json({ success: false, message: `Could not assign drone ${droneCode}` })
    return
  }
  res.json({ success: true, message: `Drone ${droneCode} assigned to ${mode}` })
}

/**
 * Executes a drone relay handoff in the simulation engine.
 */
export async function handleRelayDrone(req: Request, res: Response): Promise<void> {
  const { newDroneCode, previousDroneCode } = req.body
  if (!newDroneCode) {
    res.status(400).json({ success: false, message: 'Missing newDroneCode' })
    return
  }
  const result = simulation.relayAmbulanceEscort(newDroneCode, previousDroneCode)
  if (!result.ok) {
    res.status(400).json({ success: false, message: result.message })
    return
  }
  res.json({ success: true, message: result.message })
}

export async function handleApproveRelayRecommendation(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ success: false, message: 'Missing relay recommendation id' })
    return
  }
  try {
    const result = await approveRelayRecommendation(id)
    res.json({ success: true, message: `Relay recommendation ${id} approved`, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Relay approval failed' })
  }
}

export async function handleRejectRelayRecommendation(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ success: false, message: 'Missing relay recommendation id' })
    return
  }
  try {
    const result = await rejectRelayRecommendation(id)
    res.json({ success: true, message: `Relay recommendation ${id} rejected`, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Relay rejection failed' })
  }
}
