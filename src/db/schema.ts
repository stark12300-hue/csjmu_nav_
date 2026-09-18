import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Campus Events Table
export const campusEvents = pgTable('campus_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  time: text('time'),
  venue: text('venue'),
  posterImage: text('poster_image'),
  organizer: text('organizer'),
  contactEmail: text('contact_email'),
  status: text('status').default('approved'),
  isLive: boolean('is_live').default(true),
  likesCount: integer('likes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Campus Locations & Departments Table
export const campusLocations = pgTable('campus_locations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  hindiTitle: text('hindi_title'),
  category: text('category').notNull(),
  coordinates: jsonb('coordinates').notNull(), // [lat, lng]
  block: text('block'),
  floor: text('floor'),
  image: text('image'),
  description: text('description'),
  hindiDescription: text('hindi_description'),
  facilities: jsonb('facilities'),
  isCustom: boolean('is_custom').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
