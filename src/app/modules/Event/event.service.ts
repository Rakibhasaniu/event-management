/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { TCreateEvent, TEventQuery, TUpdateEvent } from './event.interface';
import { Event } from './event.model';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './event.constant';

const createEvent = async (payload: TCreateEvent, userId: string) => {
  // Generate event ID manually
  const eventCount = await Event.countDocuments();
  const eventId = `EVT-${String(eventCount + 1).padStart(6, '0')}`;

  const eventData = {
    ...payload,
    id: eventId, // Add this line
    createdBy: userId,
    date: new Date(payload.date),
  };

  const event = await Event.create(eventData);
  return event;
};
const getAllEvents = async (query: TEventQuery) => {
  const {
    search,
    category,
    status,
    startDate,
    endDate,
    isPublic,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    sort = '-createdAt',
  } = query;

  // Build match conditions
  const matchConditions: any = {
    isDeleted: false,
  };

  if (isPublic !== undefined) {
    matchConditions.isPublic = isPublic;
  }

  if (category) {
    matchConditions.category = category;
  }

  if (status) {
    matchConditions.status = status;
  }

  if (startDate || endDate) {
    matchConditions.date = {};
    if (startDate) matchConditions.date.$gte = new Date(startDate);
    if (endDate) matchConditions.date.$lte = new Date(endDate);
  }

  // Text search
  if (search) {
    matchConditions.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchConditions },
    {
      $addFields: {
        attendeeCount: { $size: '$attendees' },
        isUpcoming: { $gt: ['$date', new Date()] },
        daysUntilEvent: {
          $divide: [
            { $subtract: ['$date', new Date()] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: 'id',
        as: 'creator',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $project: {
        id: 1,
        title: 1,
        description: 1,
        date: 1,
        location: 1,
        category: 1,
        attendees: 1,
        attendeeCount: 1,
        maxAttendees: 1,
        status: 1,
        isPublic: 1,
        tags: 1,
        imageUrl: 1,
        createdAt: 1,
        updatedAt: 1,
        creator: { $arrayElemAt: ['$creator', 0] },
        isUpcoming: 1,
        daysUntilEvent: { $round: ['$daysUntilEvent', 1] }
      }
    },
    { $sort: { [sort.startsWith('-') ? sort.substring(1) : sort]: sort.startsWith('-') ? -1 : 1 } },
    { $skip: (Math.max(1, page) - 1) * Math.min(limit, MAX_PAGE_SIZE) },
    { $limit: Math.min(limit, MAX_PAGE_SIZE) }
  ];

  const events = await Event.aggregate(pipeline);
  
  // Get total count for pagination
  const totalPipeline = [
    { $match: matchConditions },
    { $count: 'total' }
  ];
  const totalResult = await Event.aggregate(totalPipeline);
  const total = totalResult[0]?.total || 0;

  return {
    events,
    pagination: {
      page: Math.max(1, page),
      limit: Math.min(limit, MAX_PAGE_SIZE),
      total,
      totalPages: Math.ceil(total / Math.min(limit, MAX_PAGE_SIZE)),
    }
  };
};

const getEventById = async (eventId: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    { 
      $match: { 
        id: eventId, 
        isDeleted: false 
      } 
    },
    {
      $addFields: {
        attendeeCount: { $size: '$attendees' },
        isUpcoming: { $gt: ['$date', new Date()] },
        daysUntilEvent: {
          $divide: [
            { $subtract: ['$date', new Date()] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: 'id',
        as: 'creator',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'attendees.userId',
        foreignField: 'id',
        as: 'attendeeDetails',
        pipeline: [
          { $project: { id: 1, email: 1 } }
        ]
      }
    },
    {
      $project: {
        id: 1,
        title: 1,
        description: 1,
        date: 1,
        location: 1,
        category: 1,
        attendees: 1,
        attendeeCount: 1,
        attendeeDetails: 1,
        maxAttendees: 1,
        status: 1,
        isPublic: 1,
        tags: 1,
        imageUrl: 1,
        createdAt: 1,
        updatedAt: 1,
        creator: { $arrayElemAt: ['$creator', 0] },
        isUpcoming: 1,
        daysUntilEvent: { $round: ['$daysUntilEvent', 1] }
      }
    }
  ];

  const events = await Event.aggregate(pipeline);
  const event = events[0];

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  return event;
};

const getUserEvents = async (userId: string, query: TEventQuery) => {
  const {
    search,
    category,
    status,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    sort = '-createdAt',
  } = query;

  const matchConditions: any = {
    createdBy: userId,
    isDeleted: false,
  };

  if (category) matchConditions.category = category;
  if (status) matchConditions.status = status;
  
  if (search) {
    matchConditions.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchConditions },
    {
      $addFields: {
        attendeeCount: { $size: '$attendees' },
      }
    },
    { $sort: { [sort.startsWith('-') ? sort.substring(1) : sort]: sort.startsWith('-') ? -1 : 1 } },
    { $skip: (Math.max(1, page) - 1) * Math.min(limit, MAX_PAGE_SIZE) },
    { $limit: Math.min(limit, MAX_PAGE_SIZE) }
  ];

  const events = await Event.aggregate(pipeline);
  
  const totalResult = await Event.aggregate([
    { $match: matchConditions },
    { $count: 'total' }
  ]);
  const total = totalResult[0]?.total || 0;

  return {
    events,
    pagination: {
      page: Math.max(1, page),
      limit: Math.min(limit, MAX_PAGE_SIZE),
      total,
      totalPages: Math.ceil(total / Math.min(limit, MAX_PAGE_SIZE)),
    }
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
  return updatedEvent;
};

const getEventAnalytics = async (userId?: string) => {
  const matchConditions: any = { isDeleted: false };
  if (userId) matchConditions.createdBy = userId;

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        upcomingEvents: {
          $sum: { $cond: [{ $gt: ['$date', new Date()] }, 1, 0] }
        },
        totalAttendees: { $sum: { $size: '$attendees' } },
        avgAttendeesPerEvent: { $avg: { $size: '$attendees' } },
        eventsByCategory: {
          $push: {
            category: '$category',
            attendeeCount: { $size: '$attendees' }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalEvents: 1,
        upcomingEvents: 1,
        totalAttendees: 1,
        avgAttendeesPerEvent: { $round: ['$avgAttendeesPerEvent', 1] },
        eventsByCategory: 1
      }
    }
  ];

  const analytics = await Event.aggregate(pipeline);
  return analytics[0] || {
    totalEvents: 0,
    upcomingEvents: 0,
    totalAttendees: 0,
    avgAttendeesPerEvent: 0,
    eventsByCategory: []
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