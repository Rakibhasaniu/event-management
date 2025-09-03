import { z } from 'zod';

const registerUserValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    
    role: z.enum(['user']).optional(), // Only user can register directly
    
    profile: z.object({
      firstName: z
        .string({
          required_error: 'First name is required',
        })
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name cannot exceed 50 characters'),
      
      lastName: z
        .string({
          required_error: 'Last name is required',
        })
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name cannot exceed 50 characters'),
      
      phone: z
        .string()
        .optional(),
    }),
  }),
});

const updateProfileValidationSchema = z.object({
  body: z.object({
    profile: z.object({
      firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name cannot exceed 50 characters')
        .optional(),
      
      lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name cannot exceed 50 characters')
        .optional(),
      
      phone: z
        .string()
        .optional(),
      
      avatar: z.string().url('Invalid avatar URL').optional(),
    }).optional(),
  }),
});

const updateUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'blocked'], {
      required_error: 'Status is required',
    }),
  }),
});

const getUsersValidationSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'blocked']).optional(),
    page: z.string().transform((val) => parseInt(val, 10)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    sort: z.string().optional(),
  }),
});

export const UserValidation = {
  registerUserValidationSchema,
  updateProfileValidationSchema,
  updateUserStatusValidationSchema,
  getUsersValidationSchema,
};