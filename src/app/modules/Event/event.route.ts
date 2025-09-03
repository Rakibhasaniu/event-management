import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { EventControllers } from './event.controller';
import { EventValidation } from './event.validation';

const router = express.Router();

// Public routes
router.get(
  '/',
  validateRequest(EventValidation.getEventsValidationSchema),
  EventControllers.getAllEvents
);

router.get(
  '/:eventId',
  EventControllers.getEventById
);

// Protected routes - require authentication
router.post(
  '/create',
  auth(USER_ROLE.admin, USER_ROLE.user),
  validateRequest(EventValidation.createEventValidationSchema),
  EventControllers.createEvent
);

router.get(
  '/user/my-events',
  auth( USER_ROLE.admin, USER_ROLE.user),
  validateRequest(EventValidation.getEventsValidationSchema),
  EventControllers.getUserEvents
);

router.patch(
  '/:eventId/update',
  auth(USER_ROLE.admin, USER_ROLE.user),
  validateRequest(EventValidation.updateEventValidationSchema),
  EventControllers.updateEvent
);

router.delete(
  '/:eventId/delete',
  auth(USER_ROLE.admin, USER_ROLE.user),
  EventControllers.deleteEvent
);

router.post(
  '/:eventId/rsvp',
  auth( USER_ROLE.admin, USER_ROLE.user),
  validateRequest(EventValidation.rsvpEventValidationSchema),
  EventControllers.rsvpEvent
);

router.get(
  '/analytics/dashboard',
  auth(USER_ROLE.admin, USER_ROLE.user),
  EventControllers.getEventAnalytics
);

export const EventRoutes = router;