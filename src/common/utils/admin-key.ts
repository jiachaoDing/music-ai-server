const DEFAULT_ADMIN_KEY = '123456';

export function getAdminKey() {
  return process.env.ADMIN_KEY || DEFAULT_ADMIN_KEY;
}

export function isAdminKey(value?: string | string[] | null) {
  if (!value) return false;
  const key = Array.isArray(value) ? value[0] : value;
  return String(key).trim() === getAdminKey();
}
