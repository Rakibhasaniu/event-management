import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { EventServices } from './event.service';

const createEvent = catchAsync(async (req, res) => {
  const result = await EventServices.createEvent(req.body, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event created successfully!',
    data: result,
  });
});

const getAllEvents = catchAsync(async (req, res) => {
  const result = await EventServices.getAllEvents(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events retrieved successfully!',
    data: result,
  });
});

const getEventById = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const result = await EventServices.getEventById(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event retrieved successfully!',
    data: result,
  });
});

const getUserEvents = catchAsync(async (req, res) => {
  const result = await EventServices.getUserEvents(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your events retrieved successfully!',
    data: result,
  });
});

const updateEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const result = await EventServices.updateEvent(eventId, req.body, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event updated successfully!',
    data: result,
  });
});

const deleteEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  await EventServices.deleteEvent(eventId, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event deleted successfully!',
    data: null,
  });
});

const rsvpEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { rsvpStatus } = req.body;
  const result = await EventServices.rsvpEvent(eventId, req.user.userId, rsvpStatus);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RSVP updated successfully!',
    data: result,
  });
});

const getEventAnalytics = catchAsync(async (req, res) => {
  const result = await EventServices.getEventAnalytics(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event analytics retrieved successfully!',
    data: result,
  });
});

export const EventControllers = {
  createEvent,
  getAllEvents,
  getEventById,
  getUserEvents,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getEventAnalytics,
};