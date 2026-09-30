// Where to go after signing in. Only same-site paths are allowed, so a crafted
// link like /login?next=https://evil.example can't send the pilot off-site
// (an "open redirect").
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
