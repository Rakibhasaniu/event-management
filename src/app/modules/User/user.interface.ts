/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export interface TUser {
  id: string;
  name: string; // Added name field
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
  phone?: string; // Added optional phone field
  address?: string; // Added optional address field
  profile?: {
    firstName?: string; // Made optional
    lastName?: string; // Made optional
    bio?: string; // Added bio field
    avatar?: string;
    dateOfBirth?: string; // Added date of birth
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TCreateUser {
  name: string; // Required name field
  email: string;
  password: string;
  role?: 'admin' | 'user'; // Allow both admin and user roles
  phone?: string; // Optional phone
  address?: string; // Optional address
  profile?: { // Made entire profile optional
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatar?: string;
    dateOfBirth?: string;
  };
}

export interface TUpdateUserProfile {
  name?: string; // Allow updating name
  phone?: string; // Allow updating phone
  address?: string; // Allow updating address
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatar?: string;
    dateOfBirth?: string;
  };
}

// Login interface
export interface TLoginUser {
  email: string;
  password: string;
}

// Auth response interface
export interface TAuthResponse {
  accessToken: string;
  refreshToken: string;
  needsPasswordChange: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    accountAge?: number;
  };
}

// Static methods interface
export interface UserModel extends Model<TUser> {
  isUserExistsByCustomId(id: string): Promise<TUser>;
  isUserExistsByEmail(email: string): Promise<TUser>;
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(passwordChangedTimestamp: Date, jwtIssuedTimestamp: number): boolean;
}