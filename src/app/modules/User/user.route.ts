import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from '../Auth/auth.controller';
import { AuthValidation } from '../Auth/auth.validation';

const router = express.Router();

// Public routes
router.post(
  '/register',
  validateRequest(AuthValidation.registerValidationSchema),
  AuthControllers.registerUser
);




export const UserRoutes = router;