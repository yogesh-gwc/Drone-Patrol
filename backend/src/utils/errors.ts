/** Error carrying the HTTP status the API should answer with. */
export class AppError extends Error {
  readonly status: number
  /** True when the message is safe to show a client. */
  readonly expose: boolean

  constructor(message: string, status: number, expose = true) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.expose = expose
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404)
  }
}

/**
 * A query failed or returned a row the application cannot trust.
 *
 * The underlying message is never exposed: it can contain schema details,
 * connection strings or fragments of the offending SQL.
 */
export class DatabaseError extends AppError {
  constructor(message: string, override readonly cause?: unknown) {
    super(message, 500, false)
  }
}
