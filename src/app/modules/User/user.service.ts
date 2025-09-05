/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { TCreateUser, TUpdateUserProfile, TUser } from './user.interface';
import { User } from './user.model';

const createUser = async (payload: TCreateUser) => {
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
    id: userId, // Add this line
    role: payload.role || 'user',
  };

  const newUser = await User.create(userData);
  return newUser;
};


export const UserServices = {
  createUser,
};