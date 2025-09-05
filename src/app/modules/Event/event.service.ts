/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { TCreateEvent, TUpdateEvent } from './event.interface';
import { Event } from './event.model';
import { User } from '../User/user.model';

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
// In your GET event service (likely getEventById)
const getEventById = async (eventId: string) => {
  const event = await Event.findOne({ id: eventId, isDeleted: false });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // ✅ ADD THIS: Manual population like in your RSVP service
  const eventObj = event.toObject();
  
  // Get creator details
  const creator = await User.findOne({ 
    id: eventObj.createdBy, 
    isDeleted: { $ne: true } 
  }).select('id email role name');
  
  // Get attendee details
  const attendeeUserIds = eventObj.attendees.map((a: any) => a.userId);
  const attendeeUsers = await User.find({ 
    id: { $in: attendeeUserIds }, 
    isDeleted: { $ne: true } 
  }).select('id email role name');
  
  // Map users to attendees
  const attendeesWithUserDetails = eventObj.attendees.map((attendee: any) => ({
    ...attendee,
    userDetails: attendeeUsers.find((user: any) => user.id === attendee.userId)
  }));
  
  return {
    ...eventObj,
    createdBy: creator,
    attendees: attendeesWithUserDetails
  };
};

const getUserEvents = async (userId: string, query: Record<string, unknown>) => {
  const eventQuery = Event.find({ 
    createdBy: userId, 
    isDeleted: false 
  });
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
  );
  const eventObj = updatedEvent?.toObject();
  const creator = await User.findOne({ 
    id: eventObj?.createdBy, 
    isDeleted: { $ne: true } 
  }).select('id email role name');
  return {
    ...eventObj,
    createdBy: creator
  };
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
// Fixed backend service
const rsvpEvent = async (eventId: string, userId: string, rsvpStatus: string) => {
  console.log("=== RSVP SERVICE DEBUG ===");
  console.log("eventId:", eventId, typeof eventId);
  console.log("userId:", userId, typeof userId);
  console.log("rsvpStatus:", rsvpStatus, typeof rsvpStatus);
     
  const event = await Event.findOne({ id: eventId, isDeleted: false });
  console.log("Found event:", !!event);
  
  if (event) {
    console.log("Event details:");
    console.log("- Event ID:", event.id);
    console.log("- Event title:", event.title);
    console.log("- Event createdBy:", event.createdBy, typeof event.createdBy);
    console.log("- Event isPublic:", event.isPublic);
    console.log("- Event isDeleted:", event.isDeleted);
    console.log("- Current user trying to RSVP:", userId);
    console.log("- Is user the creator?", event.createdBy === userId);
  }

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (!event.isPublic) {
    console.log("❌ Event is not public!");
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot RSVP to private event');
  }

  // Check if event is full
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees && rsvpStatus === 'attending') {
    console.log("❌ Event is full! Max:", event.maxAttendees, "Current:", event.attendees.length);
    throw new AppError(httpStatus.BAD_REQUEST, 'Event is full');
  }

  // Debug current attendees
  console.log("Current attendees:", event.attendees.length);
  event.attendees.forEach((attendee, index) => {
    console.log(`  ${index + 1}. UserId: ${attendee.userId}, Status: ${attendee.rsvpStatus}, Date: ${attendee.rsvpDate}`);
  });

  // Remove existing RSVP if exists
  const existingRsvpIndex = event.attendees.findIndex(attendee => {
    console.log("Comparing attendee.userId:", attendee.userId, "with current userId:", userId);
    return attendee.userId === userId;
  });
       
  if (existingRsvpIndex !== -1) {
    console.log("✅ Found existing RSVP at index:", existingRsvpIndex);
    console.log("Removing existing RSVP:", event.attendees[existingRsvpIndex]);
    event.attendees.splice(existingRsvpIndex, 1);
  } else {
    console.log("ℹ️ No existing RSVP found for this user");
  }

  // Add new RSVP if status is attending or maybe
  if (rsvpStatus === 'attending' || rsvpStatus === 'maybe') {
    const newAttendee = {
      userId: String(userId), // Ensure it's a string
      rsvpStatus: rsvpStatus as any,
      rsvpDate: new Date(),
    };
    console.log("✅ Adding new attendee:", newAttendee);
    event.attendees.push(newAttendee);
  } else if (rsvpStatus === 'not_attending') {
    console.log("ℹ️ User chose 'not_attending' - only removing existing RSVP if any");
  }

  console.log("Final attendees array before save:", event.attendees.length);
  event.attendees.forEach((attendee, index) => {
    console.log(`  ${index + 1}. UserId: ${attendee.userId}, Status: ${attendee.rsvpStatus}`);
  });
  
  try {
    const updatedEvent = await event.save();
    console.log("✅ Event saved successfully!");
    
    // Manual population since populate might cause issues
    const eventObj = updatedEvent.toObject();
    
    // Get creator details
    console.log("Fetching creator details for ID:", eventObj.createdBy);
    const creator = await User.findOne({ 
      id: eventObj.createdBy, 
      isDeleted: { $ne: true } 
    }).select('id email role name');
    console.log("Creator found:", !!creator);
    
    // Get attendee details
    const attendeeUserIds = eventObj.attendees.map((a: any) => a.userId);
    console.log("Fetching user details for attendee IDs:", attendeeUserIds);
    
    const attendeeUsers = await User.find({ 
      id: { $in: attendeeUserIds }, 
      isDeleted: { $ne: true } 
    }).select('id email role name');
    console.log("Attendee users found:", attendeeUsers.length);
    
    // Map users to attendees
    const attendeesWithUserDetails = eventObj.attendees.map((attendee: any) => {
      const userDetails = attendeeUsers.find((user: any) => user.id === attendee.userId);
      console.log(`Mapping attendee ${attendee.userId} to user:`, !!userDetails);
      return {
        ...attendee,
        userDetails
      };
    });
    
    const result = {
      ...eventObj,
      createdBy: creator,
      attendees: attendeesWithUserDetails
    };
    
    console.log("=== FINAL RESULT ===");
    console.log("Event ID:", result.id);
    console.log("Total attendees:", result.attendees.length);
    console.log("Creator populated:", !!result.createdBy);
    console.log("========================");
    
    return result;
    
  } catch (error) {
    console.error("❌ Error during save:", error);
    throw error;
  }
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