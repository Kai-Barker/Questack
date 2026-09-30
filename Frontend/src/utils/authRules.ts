// Form rules shown live on the Enlist screen. They mirror the backend's zod
// schemas (Backend/src/controllers/authController.ts), which are the ones that
// actually count: these just give earlier feedback.

const CALLSIGN_PATTERN = /^[A-Za-z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function callsignError(callsign: string): string | undefined {
  const value = callsign.trim();
  if (value.length < 3) return 'Use at least 3 characters.';
  if (value.length > 20) return 'Use 20 characters or fewer.';
  if (!CALLSIGN_PATTERN.test(value)) return 'Use letters, numbers, - and _ only.';
  return undefined;
}

export function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!EMAIL_PATTERN.test(value) || value.length > 255) return 'Enter a valid email address.';
  return undefined;
}

export function accessCodeChecks(password: string, confirm: string) {
  return [
    { label: '8 characters or more', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Codes match', met: confirm.length > 0 && confirm === password },
  ];
}

export function passwordError(password: string): string | undefined {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  // bcrypt on the server only reads the first 72 bytes
  if (new TextEncoder().encode(password).length > 72) return 'Use 72 characters or fewer.';
  return undefined;
}

// A copy of a field-error map without one field (used when that field is edited)
export function withoutField(errors: Record<string, string>, field: string): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field));
}
