export const USER_ROLE = {
  admin: 'admin',
  user: 'user',
} as const;

export const USER_STATUS = {
  active: 'active',
  blocked: 'blocked',
} as const;

export const UserStatus = ['active', 'blocked'];

export type TUserRole = keyof typeof USER_ROLE;