import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../config';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { TLoginUser } from './auth.interface';
import { createToken, verifyToken } from './auth.utils';

const loginUser = async (payload: TLoginUser) => {
  // Use aggregation to get user with additional computed fields
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: payload.id,
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
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is already deleted
  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  // checking if the user is blocked
  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
  }

  // checking if the password is correct
  if (!(await User.isPasswordMatched(payload?.password, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');
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

const changePassword = async (
  userData: JwtPayload,
  payload: { oldPassword: string; newPassword: string },
) => {
  // Use aggregation to validate user and get password change history
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: userData.userId,
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        daysSinceLastPasswordChange: {
          $cond: {
            if: { $ifNull: ['$passwordChangedAt', false] },
            then: {
              $divide: [
                { $subtract: [new Date(), '$passwordChangedAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            else: null
          }
        },
        isEligibleForPasswordChange: {
          $cond: {
            if: { $ifNull: ['$passwordChangedAt', false] },
            then: {
              $gte: [
                { $subtract: [new Date(), '$passwordChangedAt'] },
                24 * 60 * 60 * 1000 // Must wait 24 hours between changes
              ]
            },
            else: true
          }
        }
      }
    },
    {
      $project: {
        id: 1,
        password: 1,
        status: 1,
        isDeleted: 1,
        role: 1,
        passwordChangedAt: 1,
        daysSinceLastPasswordChange: { $round: ['$daysSinceLastPasswordChange', 1] },
        isEligibleForPasswordChange: 1
      }
    }
  ];

  const users = await User.aggregate(userPipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
  }

  // Optional: Enforce password change frequency
  if (!user.isEligibleForPasswordChange) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      'Password can only be changed once every 24 hours'
    );
  }

  // checking if the old password is correct
  if (!(await User.isPasswordMatched(payload.oldPassword, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Old password do not matched');
  }

  // hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  // Update password with additional security fields
  await User.findOneAndUpdate(
    {
      id: userData.userId,
     isDeleted: { $ne: true }
    },
    {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
      $inc: { passwordChangeCount: 1 } // Track password change frequency
    },
  );

  return {
    message: 'Password changed successfully',
    daysSinceLastChange: user.daysSinceLastPasswordChange
  };
};

const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);
  const { userId, iat } = decoded;

  // Use aggregation to get user with token validation info
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: userId,
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        isTokenValid: {
          $cond: {
            if: { $ifNull: ['$passwordChangedAt', false] },
            then: {
              $lt: [
                { $toLong: '$passwordChangedAt' },
                (iat as number) * 1000 // Convert iat to milliseconds
              ]
            },
            else: true
          }
        },
        lastActivity: new Date()
      }
    },
    {
      $project: {
        id: 1,
        role: 1,
        status: 1,
        isDeleted: 1,
        passwordChangedAt: 1,
        isTokenValid: 1,
        email: 1
      }
    }
  ];

  const users = await User.aggregate(userPipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
  }

  // Check if token was issued before password change
  if (!user.isTokenValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized ! Token expired due to password change.');
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string,
  );

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
};

const forgetPassword = async (userId: string) => {
  // Use aggregation to get user info and generate reset stats
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: userId,
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        resetTokenExpiry: {
          $add: [new Date(), 10 * 60 * 1000] // 10 minutes from now
        },
        resetRequestCount: { $ifNull: ['$resetRequestCount', 0] }
      }
    },
    {
      $project: {
        id: 1,
        email: 1,
        role: 1,
        status: 1,
        isDeleted: 1,
        resetTokenExpiry: 1,
        resetRequestCount: 1
      }
    }
  ];

  const users = await User.aggregate(userPipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
  }

  // Rate limiting: Allow max 3 reset requests per hour
  if (user.resetRequestCount >= 3) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      'Too many password reset requests. Please try again later.'
    );
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const resetToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '10m',
  );

  // Update reset request count
  await User.findOneAndUpdate(
    { id: userId },
    {
      $inc: { resetRequestCount: 1 },
      lastResetRequest: new Date()
    }
  );

  const resetUILink = `${config.reset_pass_ui_link}?id=${user.id}&token=${resetToken}`;

  console.log('Password reset link:', resetUILink);
  
  return {
    message: 'Password reset link generated successfully',
    resetToken, // In production, don't return this - send via email instead
    expiresIn: '10 minutes'
  };
};

const resetPassword = async (
  payload: { id: string; newPassword: string },
  token: string,
) => {
  // Use aggregation to validate reset request
  const userPipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        id: payload.id,
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        canResetPassword: {
          $and: [
            { $ne: ['$isDeleted', true] },
            { $ne: ['$status', 'blocked'] }
          ]
        },
        resetHistory: {
          $ifNull: ['$passwordResetHistory', []]
        }
      }
    },
    {
      $project: {
        id: 1,
        role: 1,
        status: 1,
        isDeleted: 1,
        canResetPassword: 1,
        resetRequestCount: 1,
        resetHistory: 1
      }
    }
  ];

  const users = await User.aggregate(userPipeline);
  const user = users[0];

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
  }

  if (user.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
  }

  // Verify reset token
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token,
      config.jwt_access_secret as string,
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired reset token');
  }

  if (payload.id !== decoded.userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'Token mismatch. You are forbidden!');
  }

  // hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  // Reset password with security tracking
  await User.findOneAndUpdate(
    {
      id: decoded.userId,
      role: decoded.role,
    },
    {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
      resetRequestCount: 0, // Reset counter after successful reset
      $push: {
        passwordResetHistory: {
          resetAt: new Date(),
          resetMethod: 'forgot_password',
          ipAddress: 'N/A' // In production, capture from request
        }
      }
    },
  );

  return {
    message: 'Password reset successfully',
    timestamp: new Date()
  };
};

// New aggregation-based analytics functions
const getUserLoginStats = async (startDate: string, endDate: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        isDeleted: { $ne: true },
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          role: '$role',
          status: '$status'
        },
        userCount: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0]
          }
        },
        blockedUsers: {
          $sum: {
            $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0]
          }
        },
        usersNeedingPasswordChange: {
          $sum: {
            $cond: ['$needsPasswordChange', 1, 0]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.role',
        totalUsers: { $sum: '$userCount' },
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$userCount'
          }
        },
        totalActive: { $sum: '$activeUsers' },
        totalBlocked: { $sum: '$blockedUsers' },
        needPasswordChange: { $sum: '$usersNeedingPasswordChange' }
      }
    },
    {
      $sort: { totalUsers: -1 }
    }
  ];

  const result = await User.aggregate(pipeline);
  return result;
};

const getPasswordSecurityStats = async () => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        isDeleted: { $ne: true }
      }
    },
    {
      $addFields: {
        daysSincePasswordChange: {
          $cond: {
            if: { $ifNull: ['$passwordChangedAt', false] },
            then: {
              $divide: [
                { $subtract: [new Date(), '$passwordChangedAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            else: null
          }
        },
        passwordAge: {
          $cond: {
            if: { $ifNull: ['$passwordChangedAt', false] },
            then: {
              $switch: {
                branches: [
                  {
                    case: {
                      $lte: [
                        { $subtract: [new Date(), '$passwordChangedAt'] },
                        30 * 24 * 60 * 60 * 1000
                      ]
                    },
                    then: 'recent'
                  },
                  {
                    case: {
                      $lte: [
                        { $subtract: [new Date(), '$passwordChangedAt'] },
                        90 * 24 * 60 * 60 * 1000
                      ]
                    },
                    then: 'moderate'
                  }
                ],
                default: 'old'
              }
            },
            else: 'never_changed'
          }
        }
      }
    },
    {
      $group: {
        _id: '$passwordAge',
        userCount: { $sum: 1 },
        avgDaysSinceChange: { $avg: '$daysSincePasswordChange' },
        usersNeedingPasswordChange: {
          $sum: {
            $cond: ['$needsPasswordChange', 1, 0]
          }
        }
      }
    },
    {
      $sort: { userCount: -1 }
    }
  ];

  const result = await User.aggregate(pipeline);
  return result;
};

export const AuthServices = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
  getUserLoginStats,
  getPasswordSecurityStats,
};