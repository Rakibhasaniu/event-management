import { Schema, model } from 'mongoose';
import { TEvent } from './event.interface';

const eventSchema = new Schema<TEvent>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Conference', 'Workshop', 'Meetup', 'Seminar', 'Other' ,'AllCategory'],
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User',
  },
  attendees: [{
    userId: {
      type: String,
      ref: 'User',
    },
    rsvpStatus: {
      type: String,
      enum: ['attending', 'maybe', 'not_attending'],
      default: 'attending',
    },
    rsvpDate: {
      type: Date,
      default: Date.now,
    },
  }],
  maxAttendees: {
    type: Number,
    default: null, // null means unlimited
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled','allstatus'],
    default: 'upcoming',
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  imageUrl: {
    type: String,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
eventSchema.index({ createdBy: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ title: 'text', description: 'text' }); // Text search


// Update status based on date
eventSchema.pre('save', function (next) {
  const now = new Date();
  const eventDate = new Date(this.date);
  const eventEndDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // Assume 24 hours duration

  if (now < eventDate) {
    this.status = 'upcoming';
  } else if (now >= eventDate && now < eventEndDate) {
    this.status = 'ongoing';
  } else {
    this.status = 'completed';
  }
  next();
});

export const Event = model<TEvent>('Event', eventSchema);