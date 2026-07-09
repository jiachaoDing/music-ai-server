import { User } from '@prisma/client';

export const DEV_USER: User = {
  id: 'bootstrap_admin',
  name: 'admin',
  passwordHash: '',
  avatarUrl: null,
  color: null,
  role: 'admin',
  points: 9999,
  invitedBy: null,
  lastCheckin: null,
  streak: 0,
  stats: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export function isSkipAuthEnabled() {
  return process.env.SKIP_AUTH === 'true';
}
