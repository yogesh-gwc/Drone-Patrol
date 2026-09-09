import { Router } from 'express'
import {
  getAgentState,
  handleApproveRecommendation,
  handleApproveRelayRecommendation,
  handleAssignDrone,
  handleEvaluateDrone,
  handleGetAudit,
  handleRejectRecommendation,
  handleRejectRelayRecommendation,
  handleRelayDrone,
  handleUpdateConfig,
} from '../controllers/agentController.js'

export const agentRouter = Router()

agentRouter.get('/state', getAgentState)
agentRouter.get('/audit', handleGetAudit)
agentRouter.post('/recommendations/:id/approve', handleApproveRecommendation)
agentRouter.post('/recommendations/:id/reject', handleRejectRecommendation)
agentRouter.post('/relay/:id/approve', handleApproveRelayRecommendation)
agentRouter.post('/relay/:id/reject', handleRejectRelayRecommendation)
agentRouter.post('/drones/evaluate', handleEvaluateDrone)
agentRouter.post('/config', handleUpdateConfig)
agentRouter.post('/drone/assign', handleAssignDrone)
agentRouter.post('/drone/relay', handleRelayDrone)
