export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'villa' | 'cottage';
export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'refunded';
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'credit_card' | 'maya';
export type PaymentType = 'deposit' | 'partial' | 'balance' | 'full';
export type UserRole = 'super_admin' | 'admin' | 'staff' | 'receptionist';
export type ActivityType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'verify' | 'cancel';
export type NotificationType = 'new_reservation' | 'payment_pending' | 'payment_verified' | 'payment_rejected' | 'check_in_today' | 'check_out_today' | 'cancellation' | 'low_availability' | 'system' | 'overstay';
export type EmailStatus = 'sent' | 'failed' | 'pending';

export interface Room {
  id: number;
  roomNumber: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  capacity: number;
  pricePerNight: string;
  description?: string;
  amenities?: string[];
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  nationality?: string;
  notes?: string;
  totalStays?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Reservation {
  id: number;
  confirmationCode: string;
  guestId?: number;
  roomId?: number;
  status: ReservationStatus;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  totalAmount: string;
  specialRequests?: string;
  source?: string;
  guest?: Guest;
  room?: Room;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Payment {
  id: number;
  reservationId?: number;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentType?: PaymentType;
  referenceNumber?: string;
  proofUrl?: string;
  verifiedBy?: number;
  verifiedAt?: Date;
  notes?: string;
  reservation?: Reservation;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt?: Date;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  type: ActivityType;
  entity: string;
  entityId?: number;
  description: string;
  metadata?: string;
  ipAddress?: string;
  user?: User;
  createdAt?: Date;
}

export interface AppNotification {
  id: number;
  userId?: number;
  type: NotificationType;
  title: string;
  message: string;
  entity?: string;
  entityId?: number;
  isRead: boolean;
  emailSent?: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  emailNewReservation: boolean;
  emailPaymentPending: boolean;
  emailPaymentVerified: boolean;
  emailCheckInReminder: boolean;
  emailCheckOutReminder: boolean;
  emailCancellation: boolean;
  emailLowAvailability: boolean;
  guestConfirmationEmails: boolean;
}

export interface EmailLog {
  id: number;
  toEmail: string;
  subject: string;
  template: string;
  status: EmailStatus;
  entity?: string;
  entityId?: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalReservations: number;
  pendingReservations: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  monthlyRevenue: number;
  pendingPayments: number;
  totalGuests: number;
}
