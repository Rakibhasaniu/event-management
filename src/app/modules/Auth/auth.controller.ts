import httpStatus from 'http-status';
import config from '../../config';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { refreshToken, accessToken, needsPasswordChange, user } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully!',
    data: {
      accessToken,
      needsPasswordChange,
      user, // Include user data in response
    },
  });
});

// Updated register controller with auto-login
const registerUser = catchAsync(async (req, res) => {
  const result = await AuthServices.createUserAndLogin(req.body);
  const { refreshToken, accessToken, needsPasswordChange, user } = result;

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User registered and logged in successfully!',
    data: {
      accessToken,
      needsPasswordChange,
      user,
    },
  });
});

export const AuthControllers = {
  loginUser,
  registerUser, // Updated to use new service
};