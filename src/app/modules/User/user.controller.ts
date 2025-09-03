import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';

const registerUser = catchAsync(async (req, res) => {
  const result = await UserServices.createUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User registered successfully!',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully!',
    data: result,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserServices.getUserById(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully!',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const result = await UserServices.getUserById(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrieved successfully!',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const result = await UserServices.updateUserProfile(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully!',
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const result = await UserServices.updateUserStatus(userId, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully!',
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await UserServices.deleteUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully!',
    data: null,
  });
});

const getUserStats = catchAsync(async (req, res) => {
  const result = await UserServices.getUserStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User statistics retrieved successfully!',
    data: result,
  });
});

export const UserControllers = {
  registerUser,
  getAllUsers,
  getUserById,
  getMyProfile,
  updateMyProfile,
  updateUserStatus,
  deleteUser,
  getUserStats,
};