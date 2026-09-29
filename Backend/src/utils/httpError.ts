// An error that carries the HTTP status to send back.
// Throw it from a controller and the error handler in index.ts replies with it.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
