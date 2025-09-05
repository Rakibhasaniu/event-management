import { z } from 'zod';

// Fixed registration validation - required fields marked properly
const registerUserValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }).min(1, 'Name cannot be empty'),
    
    email: z.string({
      required_error: 'Email is required',
    }).email('Invalid email format'),
    
    password: z.string({
      required_error: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),
    
    phone: z.string().optional(),
    address: z.string().optional(),
    role: z.enum(['admin', 'user']).optional().default('user'),
    
    // Profile is completely optional for registration
    profile: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().url('Invalid avatar URL').optional(),
      dateOfBirth: z.string().optional(),
    }).optional(),
  }),
});

// Login validation (separate from registration)
const loginUserValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }).email('Invalid email format'),
    
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});


export const UserValidation = {
  registerUserValidationSchema,
  loginUserValidationSchema,

};