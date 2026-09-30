// An error that carries the HTTP status to send back.
// Throw it from a controller and the error handler in index.ts replies with it.
// `fields` holds per-field messages for form validation errors.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
