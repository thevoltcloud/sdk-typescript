/** Volt SDK error hierarchy. Mirrors the handbook SDK design (§10). */

export interface VoltErrorFields {
  status?: number;
  requestId?: string;
  podId?: string;
  hint?: string;
}

export class VoltError extends Error {
  readonly status?: number;
  readonly requestId?: string;
  readonly podId?: string;
  readonly hint?: string;

  constructor(message: string, fields: VoltErrorFields = {}) {
    let detail = message;
    if (fields.hint) detail = `${detail} (${fields.hint})`;
    if (fields.requestId) detail = `${detail} [request_id=${fields.requestId}]`;
    super(detail);
    this.name = new.target.name;
    this.status = fields.status;
    this.requestId = fields.requestId;
    this.podId = fields.podId;
    this.hint = fields.hint;
  }
}

export class AuthError extends VoltError {}
export class PermissionError extends VoltError {}
export class SovereigntyViolation extends VoltError {}
export class QuotaExceeded extends VoltError {}
export class NoCapacity extends VoltError {}
export class InvalidRequest extends VoltError {}
export class ModelNotFound extends VoltError {}
export class StreamInterrupted extends VoltError {}
export class ServerError extends VoltError {}

export function fromStatus(status: number, message: string, fields: VoltErrorFields = {}): VoltError {
  const f = { ...fields, status };
  switch (status) {
    case 400:
      return new InvalidRequest(message, f);
    case 401:
      return new AuthError(message, f);
    case 403:
      return new PermissionError(message, f);
    case 404:
      return new ModelNotFound(message, f);
    case 429:
      return new QuotaExceeded(message, f);
    case 503:
      return new NoCapacity(message, f);
    default:
      return status >= 500 ? new ServerError(message, f) : new VoltError(message, f);
  }
}
