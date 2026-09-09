import {
  findAllDrones,
  findDroneByCode,
  findDroneById,
} from '../database/repositories/droneRepository.js'
import type { Drone } from '../types/domain.js'
import { NotFoundError } from '../utils/errors.js'
import type { Identifier } from '../utils/validation.js'

export function listDrones(): Promise<Drone[]> {
  return findAllDrones()
}

/** Resolves a drone by primary key or drone code, e.g. `5` or `DR-05`. */
export async function getDrone(identifier: Identifier): Promise<Drone> {
  const drone =
    identifier.kind === 'id'
      ? await findDroneById(identifier.id)
      : await findDroneByCode(identifier.code)

  if (!drone) {
    const label = identifier.kind === 'id' ? identifier.id : identifier.code
    throw new NotFoundError(`Drone "${label}" was not found`)
  }
  return drone
}
