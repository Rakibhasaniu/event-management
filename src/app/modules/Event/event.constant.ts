export const EVENT_CATEGORIES = [
  'Conference',
  'Workshop', 
  'Meetup',
  'Seminar',
  'Other',
  'AllCategory'

] as const;

export const EVENT_STATUS = [
  'upcoming',
  'ongoing', 
  'completed',
  'cancelled',
  'allstatus'
] as const;

export const RSVP_STATUS = [
  'attending',
  'maybe',
  'not_attending'
] as const;

export const EVENT_SORT_OPTIONS = {
  DATE_ASC: 'date',
  DATE_DESC: '-date',
  CREATED_ASC: 'createdAt',
  CREATED_DESC: '-createdAt',
  TITLE_ASC: 'title',
  TITLE_DESC: '-title',
  ATTENDEES_ASC: 'attendees',
  ATTENDEES_DESC: '-attendees',
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;