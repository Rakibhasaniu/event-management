/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { TCreateEvent, TUpdateEvent } from './event.interface';
import { Event } from './event.model';

const createEvent = async (payload: TCreateEvent, userId: string) => {
  // Generate event ID manually
  const eventCount = await Event.countDocuments();
  const eventId = `EVT-${String(eventCount + 1).padStart(6, '0')}`;

  const eventData = {
    ...payload,
    id: eventId,
    createdBy: userId,
    date: new Date(payload.date),
  };

  const event = await Event.create(eventData);
  return event;
};

const getAllEvents = async (query: Record<string, unknown>) => {
  console.log("🚀 ~ getAllEvents ~ query:", query);
  
  // Handle 'AllCategory' by removing category from query (case-insensitive check)
  if (query.category && String(query.category).toLowerCase() === 'allcategory') {
    delete query.category;
  }
  
  // Handle 'allstatus' by removing status from query (case-insensitive check)
  if (query.status && String(query.status).toLowerCase() === 'allstatus') {
    delete query.status;
  }
  
  // Build base query for non-deleted events
  const eventQuery = Event.find({ isDeleted: false });

  // Searchable fields for events
  const searchableFields = ['title', 'description', 'location', 'tags'];

  // Apply QueryBuilder
  const eventQueryBuilder = new QueryBuilder(eventQuery, query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  // Execute query
  const events = await eventQueryBuilder.modelQuery;

  // Get pagination info
  const meta = await eventQueryBuilder.countTotal();

  // Get all available categories if requested (also case-insensitive)
  let categories = null;
  if (query.includeCategories === 'true' || 
      (query.category && String(query.category).toLowerCase() === 'allcategory')) {
    categories = await Event.distinct('category', { isDeleted: false });
  }

  return {
    events,
    meta,
    ...(categories && { categories }), // Only include categories if they exist
  };
};
const getEventById = async (eventId: string) => {
  const event = await Event.findOne({ id: eventId, isDeleted: false });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  return event;
};

const getUserEvents = async (userId: string, query: Record<string, unknown>) => {
  const eventQuery = Event.find({ createdBy: userId, isDeleted: false });
    const filteredQuery = { ...query };
    if (filteredQuery.status === 'allstatus') {
    delete filteredQuery.status;
  }
    if (filteredQuery.category === 'AllCategory') {
    delete filteredQuery.category;
  }
    const searchableFields = ['title', 'description'];
    const eventQueryBuilder = new QueryBuilder(eventQuery, filteredQuery)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();
    const events = await eventQueryBuilder.modelQuery;
    const meta = await eventQueryBuilder.countTotal();
  
  return {
    events,
    meta,
  };
};

const updateEvent = async (eventId: string, payload: TUpdateEvent, userId: string) => {

  const event = await Event.findOne({ id: eventId, isDeleted: false });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (event.createdBy !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own events');
  }

  const updateData = { ...payload };
  if (payload.date) {
    updateData.date = new Date(payload.date);
  }

  const updatedEvent = await Event.findOneAndUpdate(
    { id: eventId },
    updateData,
    { new: true, runValidators: true }
  ).populate('createdBy', 'id email role');

  return updatedEvent;
};

const deleteEvent = async (eventId: string, userId: string) => {
  const event = await Event.findOne({ id: eventId, isDeleted: false });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (event.createdBy !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own events');
  }

  const deletedEvent = await Event.findOneAndUpdate(
    { id: eventId },
    { isDeleted: true },
    { new: true }
  );

  return deletedEvent;
};

const rsvpEvent = async (eventId: string, userId: string, rsvpStatus: string) => {
  const event = await Event.findOne({ id: eventId, isDeleted: false });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (!event.isPublic) {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot RSVP to private event');
  }

  // Check if event is full
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees && rsvpStatus === 'attending') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Event is full');
  }

  // Remove existing RSVP if exists
  const existingRsvpIndex = event.attendees.findIndex(attendee => attendee.userId === userId);
  
  if (existingRsvpIndex !== -1) {
    event.attendees.splice(existingRsvpIndex, 1);
  }

  // Add new RSVP if status is attending or maybe
  if (rsvpStatus === 'attending' || rsvpStatus === 'maybe') {
    event.attendees.push({
      userId,
      rsvpStatus: rsvpStatus as any,
      rsvpDate: new Date(),
    });
  }

  const updatedEvent = await event.save();
  return updatedEvent.populate('createdBy', 'id email role');
};

const getEventAnalytics = async (userId?: string) => {
  // Build filter conditions
  const matchConditions: any = { isDeleted: false };
  if (userId) {
    matchConditions.createdBy = userId;
  }

  // Get all events matching conditions
  const events = await Event.find(matchConditions);

  // Calculate analytics manually
  const totalEvents = events.length;
  const upcomingEvents = events.filter(event => new Date(event.date) > new Date()).length;
  const totalAttendees = events.reduce((sum, event) => sum + event.attendees.length, 0);
  const avgAttendeesPerEvent = totalEvents > 0 ? Math.round((totalAttendees / totalEvents) * 10) / 10 : 0;

  // Group events by category
  const eventsByCategory = events.reduce((acc: any[], event) => {
    const existing = acc.find(item => item.category === event.category);
    if (existing) {
      existing.eventCount += 1;
      existing.attendeeCount += event.attendees.length;
    } else {
      acc.push({
        category: event.category,
        eventCount: 1,
        attendeeCount: event.attendees.length,
      });
    }
    return acc;
  }, []);

  return {
    totalEvents,
    upcomingEvents,
    totalAttendees,
    avgAttendeesPerEvent,
    eventsByCategory,
  };
};

export const EventServices = {
  createEvent,
  getAllEvents,
  getEventById,
  getUserEvents,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getEventAnalytics,
};