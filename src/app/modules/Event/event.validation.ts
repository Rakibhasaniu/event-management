import { z } from 'zod';
import { EVENT_CATEGORIES, RSVP_STATUS } from './event.constant';

const createEventValidationSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Event title is required',
    }).min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    
    description: z.string({
      required_error: 'Event description is required',
    }).min(10, 'Description must be at least 10 characters').max(1000, 'Description cannot exceed 1000 characters'),
    
    date: z.string({
      required_error: 'Event date is required',
    }).refine((date) => {
      const eventDate = new Date(date);
      const now = new Date();
      return eventDate > now;
    }, 'Event date must be in the future'),
    
    location: z.string({
      required_error: 'Event location is required',
    }).min(3, 'Location must be at least 3 characters'),
    
    category: z.enum(EVENT_CATEGORIES, {
      required_error: 'Event category is required',
    }),
    
    maxAttendees: z.number().min(1, 'Max attendees must be at least 1').optional(),
    isPublic: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
  }),
});

const updateEventValidationSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100).optional(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000).optional(),
    date: z.string().refine((date) => {
      if (!date) return true;
      const eventDate = new Date(date);
      const now = new Date();
      return eventDate > now;
    }, 'Event date must be in the future').optional(),
    location: z.string().min(3, 'Location must be at least 3 characters').optional(),
    category: z.enum(EVENT_CATEGORIES).optional(),
    maxAttendees: z.number().min(1, 'Max attendees must be at least 1').optional(),
    isPublic: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  }),
});

const rsvpEventValidationSchema = z.object({
  body: z.object({
    rsvpStatus: z.enum(RSVP_STATUS, {
      required_error: 'RSVP status is required',
    }),
  }),
});

const getEventsValidationSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.enum(EVENT_CATEGORIES).optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isPublic: z.string().transform((val) => val === 'true').optional(),
    page: z.string().transform((val) => parseInt(val, 10)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    sort: z.string().optional(),
  }),
});

export const EventValidation = {
  createEventValidationSchema,
  updateEventValidationSchema,
  rsvpEventValidationSchema,
  getEventsValidationSchema,
};