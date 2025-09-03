// modules/User/user.constant.ts
export const USER_ROLE = {
  superAdmin: 'superAdmin',   // System administrator - full access
  admin: 'admin',            // HR/Manager - manages employees and schedules  
  employee: 'employee',      // Regular employees - manage own profile/availability
} as const;

export const UserStatus = ['in-progress', 'blocked'];