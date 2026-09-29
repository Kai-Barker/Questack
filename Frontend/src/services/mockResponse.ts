// Stand-in for an API call while its endpoint doesn't exist yet.
// The delay lets loading states show; the copy stops components mutating the shared mock.
export function mockResponse<T>(data: T, delayMs = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), delayMs));
}

// Stand-in for a 404 from an endpoint that doesn't exist yet
export function mockNotFound(message: string, delayMs = 400): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), delayMs));
}
