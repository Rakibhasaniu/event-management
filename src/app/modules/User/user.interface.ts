/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export interface TUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  isDeleted: boolean;
  needsPasswordChange: boolean;
  passwordChangedAt?: Date;
  passwordChangeCount?: number;
  resetRequestCount?: number;
  lastResetRequest?: Date;
  passwordResetHistory?: Array<{
    resetAt: Date;
    resetMethod: string;
    ipAddress: string;
  }>;
  profile?: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TCreateUser {
  email: string;
  password: string;
  role?: 'user';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface TUpdateUserProfile {
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
}

// Static methods interface
export interface UserModel extends Model<TUser> {
  isUserExistsByCustomId(id: string): Promise<TUser>;
  isUserExistsByEmail(email: string): Promise<TUser>;
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(passwordChangedTimestamp: Date, jwtIssuedTimestamp: number): boolean;
}