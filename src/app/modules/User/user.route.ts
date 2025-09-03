import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from './user.constant';
import { UserControllers } from './user.controller';
import { UserValidation } from './user.validation';

const router = express.Router();

// Public routes
router.post(
  '/register',
  validateRequest(UserValidation.registerUserValidationSchema),
  UserControllers.registerUser
);

// Protected routes - require authentication
router.get(
  '/profile',
  auth(USER_ROLE.admin, USER_ROLE.user),
  UserControllers.getMyProfile
);

router.patch(
  '/profile',
  auth(USER_ROLE.admin, USER_ROLE.user),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserControllers.updateMyProfile
);

// Admin only routes
router.get(
  '/',
  auth(USER_ROLE.admin),
  validateRequest(UserValidation.getUsersValidationSchema),
  UserControllers.getAllUsers
);

router.get(
  '/stats',
  auth(USER_ROLE.admin),
  UserControllers.getUserStats
);

router.get(
  '/:userId',
  auth(USER_ROLE.admin),
  UserControllers.getUserById
);

router.patch(
  '/:userId/status',
  auth(USER_ROLE.admin),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserControllers.updateUserStatus
);

router.delete(
  '/:userId',
  auth(USER_ROLE.admin),
  UserControllers.deleteUser
);

export const UserRoutes = router;