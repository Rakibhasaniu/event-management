import { Document } from 'mongoose';

export interface TAttendee {
  userId: string;
  rsvpStatus: 'attending' | 'maybe' | 'not_attending';
  rsvpDate: Date;
}

export interface TEvent extends Document {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  category: 'Conference' | 'Workshop' | 'Meetup' | 'Seminar' | 'Other' | 'AllCategory';
  createdBy: string;
  attendees: TAttendee[];
  maxAttendees?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'allstatus';
  isPublic: boolean;
  tags: string[];
  imageUrl?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TCreateEvent {
  title: string;
  description: string;
  date: string;
  location: string;
  category: 'Conference' | 'Workshop' | 'Meetup' | 'Seminar' | 'Other' |'AllCategory';
  maxAttendees?: number;
  isPublic?: boolean;
  tags?: string[];
  imageUrl?: string;
}

export interface TUpdateEvent {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  category?: 'Conference' | 'Workshop' | 'Meetup' | 'Seminar' | 'Other' |'AllCategory';
  maxAttendees?: number;
  isPublic?: boolean;
  tags?: string[];
  imageUrl?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'allstatus';
}

export interface TEventQuery {
  search?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface TRSVPEvent {
  eventId: string;
  rsvpStatus: 'attending' | 'maybe' | 'not_attending';
}