/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../../config';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { TLoginUser, TAuthResponse } from './auth.interface';
import { createToken } from './auth.utils';

const loginUser = async (payload: TLoginUser): Promise<TAuthResponse> => {
  // Use aggregation to get user with additional computed fields
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        email: payload.email, // Changed from 'id' to 'email'
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        isActive: {
          $and: [
            { $ne: ['$isDeleted', true] },
            { $ne: ['$status', 'blocked'] }
          ]
        },
        accountAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $project: {
        id: 1,
        email: 1,
        password: 1,
        role: 1,
        status: 1,
        isDeleted: 1,
        needsPasswordChange: 1,
        passwordChangedAt: 1,
        isActive: 1,
        accountAge: { $round: ['$accountAge', 0] },
        createdAt: 1,
        updatedAt: 1
      }
    }
  ];

  const users = await User.aggregate(userPipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invalid email or password!'); // More generic message for security
  }

  // checking if the user is already deleted
  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been deleted!');
  }

  // checking if the user is blocked
  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This account is blocked!');
  }

  // checking if the password is correct
  if (!(await User.isPasswordMatched(payload?.password, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid email or password!');
  }

  // create token and sent to the client
  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string,
  );

  return {
    accessToken,
    refreshToken,
    needsPasswordChange: user?.needsPasswordChange,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      accountAge: user.accountAge
    }
  };
};

// New function for auto-login after registration
const createUserAndLogin = async (payload: any): Promise<TAuthResponse> => {
  // Check if user already exists
  const existingUser = await User.isUserExistsByEmail(payload.email);
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists with this email!');
  }

  // Generate ID manually
  const userCount = await User.countDocuments();
  const userId = `USER-${String(userCount + 1).padStart(6, '0')}`;

  // Create user with explicit ID
  const userData = {
    ...payload,
    id: userId,
    role: payload.role || 'user',
    needsPasswordChange: false, // New users don't need to change password immediately
  };

  const newUser = await User.create(userData);

  // Automatically login the user after registration
  const loginPayload: TLoginUser = {
    email: newUser.email,
    password: payload.password, // Use original password before hashing
  };

  // Call loginUser to get tokens
  return await loginUser(loginPayload);
};

export const AuthServices = {
  loginUser,
  createUserAndLogin, // New service for register + login
};