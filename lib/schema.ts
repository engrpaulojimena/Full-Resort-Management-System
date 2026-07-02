import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const roomStatusEnum = pgEnum('room_status', ['available', 'occupied', 'maintenance', 'reserved']);
export const roomTypeEnum = pgEnum('room_type', ['standard', 'deluxe', 'suite', 'villa', 'cottage']);
export const reservationStatusEnum = pgEnum('reservation_status', ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'verified', 'rejected', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'gcash', 'bank_transfer', 'credit_card', 'maya']);
export const paymentTypeEnum = pgEnum('payment_type', ['deposit', 'partial', 'balance', 'full']);
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'staff', 'receptionist']);
export const activityTypeEnum = pgEnum('activity_type', ['create', 'update', 'delete', 'login', 'logout', 'verify', 'cancel']);
export const notificationTypeEnum = pgEnum('notification_type', ['new_reservation', 'payment_pending', 'payment_verified', 'payment_rejected', 'check_in_today', 'check_out_today', 'cancellation', 'low_availability', 'system', 'overstay']);
export const emailStatusEnum = pgEnum('email_status', ['sent', 'failed', 'pending']);

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  roomNumber: varchar('room_number', { length: 10 }).notNull().unique(),
  type: roomTypeEnum('type').notNull(),
  status: roomStatusEnum('status').notNull().default('available'),
  floor: integer('floor').notNull().default(1),
  capacity: integer('capacity').notNull().default(2),
  pricePerNight: numeric('price_per_night', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  amenities: text('amenities').array(),
  images: text('images').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const guests = pgTable('guests', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  address: text('address'),
  idType: varchar('id_type', { length: 50 }),
  idNumber: varchar('id_number', { length: 100 }),
  nationality: varchar('nationality', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  confirmationCode: varchar('confirmation_code', { length: 20 }).notNull().unique(),
  guestId: integer('guest_id').references(() => guests.id),
  roomId: integer('room_id').references(() => rooms.id),
  status: reservationStatusEnum('status').notNull().default('pending'),
  checkIn: timestamp('check_in').notNull(),
  checkOut: timestamp('check_out').notNull(),
  adults: integer('adults').notNull().default(1),
  children: integer('children').default(0),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  specialRequests: text('special_requests'),
  source: varchar('source', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  reservationId: integer('reservation_id').references(() => reservations.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentType: paymentTypeEnum('payment_type'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  proofUrl: text('proof_url'),
  verifiedBy: integer('verified_by'),
  verifiedAt: timestamp('verified_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: userRoleEnum('role').notNull().default('staff'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: activityTypeEnum('type').notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: integer('entity_id'),
  description: text('description').notNull(),
  metadata: text('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  entity: varchar('entity', { length: 50 }),
  entityId: integer('entity_id'),
  isRead: boolean('is_read').default(false),
  emailSent: boolean('email_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  template: varchar('template', { length: 100 }).notNull(),
  status: emailStatusEnum('status').notNull().default('pending'),
  entity: varchar('entity', { length: 50 }),
  entityId: integer('entity_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});
