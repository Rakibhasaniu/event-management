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

const getAllUsers = async (query: any) => {
  const {
    search,
    role,
    status,
    page = 1,
    limit = 10,
    sort = '-createdAt',
  } = query;

  const matchConditions: any = {
    isDeleted: false,
  };

  if (role) matchConditions.role = role;
  if (status) matchConditions.status = status;

  if (search) {
    matchConditions.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
    ];
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchConditions },
    {
      $addFields: {
        fullName: {
          $concat: ['$profile.firstName', ' ', '$profile.lastName']
        },
        accountAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $project: {
        id: 1,
        email: 1,
        role: 1,
        status: 1,
        profile: 1,
        fullName: 1,
        accountAge: { $round: ['$accountAge', 0] },
        createdAt: 1,
        updatedAt: 1,
        needsPasswordChange: 1,
      }
    },
    { $sort: { [sort.startsWith('-') ? sort.substring(1) : sort]: sort.startsWith('-') ? -1 : 1 } },
    { $skip: (Math.max(1, page) - 1) * Math.min(limit, 100) },
    { $limit: Math.min(limit, 100) }
  ];

  const users = await User.aggregate(pipeline);
  
  const totalResult = await User.aggregate([
    { $match: matchConditions },
    { $count: 'total' }
  ]);
  const total = totalResult[0]?.total || 0;

  return {
    users,
    pagination: {
      page: Math.max(1, page),
      limit: Math.min(limit, 100),
      total,
      totalPages: Math.ceil(total / Math.min(limit, 100)),
    }
  };
};

const getUserById = async (userId: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: userId,
        isDeleted: false,
      }
    },
    {
      $addFields: {
        fullName: {
          $concat: ['$profile.firstName', ' ', '$profile.lastName']
        },
        accountAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $project: {
        id: 1,
        email: 1,
        role: 1,
        status: 1,
        profile: 1,
        fullName: 1,
        accountAge: { $round: ['$accountAge', 0] },
        createdAt: 1,
        updatedAt: 1,
        needsPasswordChange: 1,
      }
    }
  ];

  const users = await User.aggregate(pipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  return user;
};

const updateUserProfile = async (userId: string, payload: TUpdateUserProfile) => {
  const user = await User.findOne({ id: userId, isDeleted: false });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const updatedUser = await User.findOneAndUpdate(
    { id: userId },
    { profile: { ...user.profile, ...payload.profile } },
    { new: true, runValidators: true }
  );

  return updatedUser;
};

const updateUserStatus = async (userId: string, status: 'active' | 'blocked') => {
  const user = await User.findOne({ id: userId, isDeleted: false });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const updatedUser = await User.findOneAndUpdate(
    { id: userId },
    { status },
    { new: true }
  );

  return updatedUser;
};

const deleteUser = async (userId: string) => {
  const user = await User.findOne({ id: userId, isDeleted: false });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const deletedUser = await User.findOneAndUpdate(
    { id: userId },
    { isDeleted: true },
    { new: true }
  );

  return deletedUser;
};

const getUserStats = async () => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        isDeleted: false,
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        blockedUsers: {
          $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        regularUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
        },
        usersNeedingPasswordChange: {
          $sum: { $cond: ['$needsPasswordChange', 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        activeUsers: 1,
        blockedUsers: 1,
        adminUsers: 1,
        regularUsers: 1,
        usersNeedingPasswordChange: 1,
      }
    }
  ];

  const stats = await User.aggregate(pipeline);
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    usersNeedingPasswordChange: 0,
  };
};

export const UserServices = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserProfile,
  updateUserStatus,
  deleteUser,
  getUserStats,
};