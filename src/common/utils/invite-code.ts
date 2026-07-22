import { randomBytes } from 'node:crypto';

export const USER_INVITE_CODE_COUNT = 3;

export function generateInviteCode() {
  return `ECHO-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export function generateInviteCodes(count = USER_INVITE_CODE_COUNT) {
  return Array.from({ length: count }, generateInviteCode);
}
