export function isDemoEmail(email: string): boolean {
  return /^demo(?:-[a-z0-9]+)?@naengteol\.local$/i.test(email.trim());
}
