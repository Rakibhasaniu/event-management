import { z } from 'zod';

// Updated login validation schema
const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required.',
      })
      .email('Invalid email format'),
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});

// Registration validation schema
const registerValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required.',
      })
      .email('Invalid email format'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'user']).optional().default('user'),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  registerValidationSchema,
};