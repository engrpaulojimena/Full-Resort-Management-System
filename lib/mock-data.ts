import {
  Room, Guest, Reservation, Payment, User, ActivityLog, AppNotification, DashboardStats,
  NotificationPreferences, EmailLog,
} from '@/types';

export const mockRooms: Room[] = [
  { id: 1, roomNumber: '101', type: 'standard', status: 'available', floor: 1, capacity: 2, pricePerNight: '2500', amenities: ['WiFi', 'AC', 'TV'], createdAt: new Date() },
  { id: 2, roomNumber: '102', type: 'standard', status: 'occupied', floor: 1, capacity: 2, pricePerNight: '2500', amenities: ['WiFi', 'AC', 'TV'], createdAt: new Date() },
  { id: 3, roomNumber: '201', type: 'deluxe', status: 'available', floor: 2, capacity: 3, pricePerNight: '3800', amenities: ['WiFi', 'AC', 'TV', 'Mini-bar'], createdAt: new Date() },
  { id: 4, roomNumber: '202', type: 'deluxe', status: 'reserved', floor: 2, capacity: 3, pricePerNight: '3800', amenities: ['WiFi', 'AC', 'TV', 'Mini-bar'], createdAt: new Date() },
  { id: 5, roomNumber: '301', type: 'suite', status: 'available', floor: 3, capacity: 4, pricePerNight: '6500', amenities: ['WiFi', 'AC', 'TV', 'Mini-bar', 'Jacuzzi', 'Balcony'], createdAt: new Date() },
  { id: 6, roomNumber: 'V01', type: 'villa', status: 'available', floor: 1, capacity: 8, pricePerNight: '15000', amenities: ['WiFi', 'AC', 'TV', 'Private Pool', 'Kitchen', 'BBQ'], createdAt: new Date() },
  { id: 7, roomNumber: 'C01', type: 'cottage', status: 'maintenance', floor: 1, capacity: 4, pricePerNight: '4500', amenities: ['WiFi', 'AC', 'Fan', 'Outdoor Shower'], createdAt: new Date() },
  { id: 8, roomNumber: '103', type: 'standard', status: 'available', floor: 1, capacity: 2, pricePerNight: '2500', amenities: ['WiFi', 'AC', 'TV'], createdAt: new Date() },
];

export const mockGuests: Guest[] = [
  { id: 1, firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@email.com', phone: '09171234567', nationality: 'Filipino', totalStays: 3, createdAt: new Date('2024-01-15') },
  { id: 2, firstName: 'Juan', lastName: 'dela Cruz', email: 'juan.delacruz@email.com', phone: '09281234567', nationality: 'Filipino', totalStays: 1, createdAt: new Date('2024-03-10') },
  { id: 3, firstName: 'Emily', lastName: 'Chen', email: 'emily.chen@email.com', phone: '+886912345678', nationality: 'Taiwanese', totalStays: 2, createdAt: new Date('2024-02-20') },
  { id: 4, firstName: 'Robert', lastName: 'Johnson', email: 'r.johnson@email.com', phone: '+12025551234', nationality: 'American', totalStays: 1, createdAt: new Date('2024-04-05') },
  { id: 5, firstName: 'Ana', lastName: 'Reyes', email: 'ana.reyes@email.com', phone: '09351234567', nationality: 'Filipino', totalStays: 5, createdAt: new Date('2023-11-01') },
];

export const mockReservations: Reservation[] = [
  {
    id: 1,
    confirmationCode: 'RSV-A1B2C3',
    guestId: 1,
    roomId: 2,
    status: 'checked_in',
    checkIn: new Date('2025-07-01'),
    checkOut: new Date('2025-07-05'),
    adults: 2,
    children: 0,
    totalAmount: '10000',
    source: 'walk_in',
    guest: { id: 1, firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@email.com', phone: '09171234567', nationality: 'Filipino' },
    room: { id: 2, roomNumber: '102', type: 'standard', status: 'occupied', floor: 1, capacity: 2, pricePerNight: '2500' },
    createdAt: new Date('2025-06-28'),
  },
  {
    id: 2,
    confirmationCode: 'RSV-D4E5F6',
    guestId: 3,
    roomId: 4,
    status: 'confirmed',
    checkIn: new Date('2025-07-10'),
    checkOut: new Date('2025-07-14'),
    adults: 2,
    children: 1,
    totalAmount: '15200',
    source: 'online',
    guest: { id: 3, firstName: 'Emily', lastName: 'Chen', email: 'emily.chen@email.com', phone: '+886912345678', nationality: 'Taiwanese' },
    room: { id: 4, roomNumber: '202', type: 'deluxe', status: 'reserved', floor: 2, capacity: 3, pricePerNight: '3800' },
    createdAt: new Date('2025-07-01'),
  },
  {
    id: 3,
    confirmationCode: 'RSV-G7H8I9',
    guestId: 5,
    roomId: 5,
    status: 'pending',
    checkIn: new Date('2025-07-20'),
    checkOut: new Date('2025-07-25'),
    adults: 3,
    children: 1,
    totalAmount: '32500',
    source: 'phone',
    guest: { id: 5, firstName: 'Ana', lastName: 'Reyes', email: 'ana.reyes@email.com', phone: '09351234567', nationality: 'Filipino' },
    room: { id: 5, roomNumber: '301', type: 'suite', status: 'available', floor: 3, capacity: 4, pricePerNight: '6500' },
    createdAt: new Date('2025-07-02'),
  },
];

export const mockPayments: Payment[] = [
  {
    id: 1,
    reservationId: 1,
    amount: '5000',
    method: 'gcash',
    status: 'verified',
    paymentType: 'deposit',
    referenceNumber: 'GC20250628001',
    createdAt: new Date('2025-06-28'),
  },
  {
    id: 2,
    reservationId: 1,
    amount: '5000',
    method: 'cash',
    status: 'pending',
    paymentType: 'balance',
    createdAt: new Date('2025-07-01'),
  },
  {
    id: 3,
    reservationId: 2,
    amount: '7600',
    method: 'bank_transfer',
    status: 'verified',
    paymentType: 'deposit',
    referenceNumber: 'BDO20250701001',
    createdAt: new Date('2025-07-01'),
  },
];

export const mockUsers: User[] = [
  { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@resort.com', role: 'admin', isActive: true, lastLoginAt: new Date(), createdAt: new Date('2024-01-01') },
  { id: 2, firstName: 'Liza', lastName: 'Gomez', email: 'liza@resort.com', role: 'receptionist', isActive: true, lastLoginAt: new Date('2025-07-01'), createdAt: new Date('2024-03-01') },
  { id: 3, firstName: 'Marco', lastName: 'Villanueva', email: 'marco@resort.com', role: 'staff', isActive: true, lastLoginAt: new Date('2025-06-30'), createdAt: new Date('2024-05-01') },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: 1, userId: 2, type: 'create', entity: 'reservation', entityId: 3, description: 'Created reservation RSV-G7H8I9 for Ana Reyes', createdAt: new Date('2025-07-02T09:15:00'), user: mockUsers[1] },
  { id: 2, userId: 2, type: 'verify', entity: 'payment', entityId: 3, description: 'Verified payment BDO20250701001 for RSV-D4E5F6', createdAt: new Date('2025-07-01T14:30:00'), user: mockUsers[1] },
  { id: 3, userId: 1, type: 'update', entity: 'room', entityId: 7, description: 'Set Room C01 status to maintenance', createdAt: new Date('2025-07-01T10:00:00'), user: mockUsers[0] },
  { id: 4, userId: 2, type: 'login', entity: 'user', entityId: 2, description: 'User liza@resort.com logged in', createdAt: new Date('2025-07-01T08:00:00'), user: mockUsers[1] },
];

export const mockStats: DashboardStats = {
  totalRooms: 8,
  availableRooms: 5,
  occupiedRooms: 2,
  totalReservations: 3,
  pendingReservations: 1,
  todayCheckIns: 0,
  todayCheckOuts: 0,
  monthlyRevenue: 57700,
  pendingPayments: 1,
  totalGuests: 5,
};

export const revenueChartData = [
  { month: 'Feb', revenue: 42000 },
  { month: 'Mar', revenue: 58000 },
  { month: 'Apr', revenue: 51000 },
  { month: 'May', revenue: 67000 },
  { month: 'Jun', revenue: 73000 },
  { month: 'Jul', revenue: 57700 },
];

export const occupancyData = [
  { name: 'Occupied', value: 2, color: '#234E43' },
  { name: 'Available', value: 5, color: '#6FA39A' },
  { name: 'Maintenance', value: 1, color: '#E57373' },
];

export const defaultNotificationPreferences: NotificationPreferences = {
  emailNewReservation: true,
  emailPaymentPending: true,
  emailPaymentVerified: true,
  emailCheckInReminder: true,
  emailCheckOutReminder: false,
  emailCancellation: true,
  emailLowAvailability: false,
  guestConfirmationEmails: true,
};

export const mockEmailLogs: EmailLog[] = [
  {
    id: 1,
    toEmail: 'john.smith@email.com',
    subject: 'Booking Confirmation – Deluxe Ocean View',
    template: 'guest_confirmation',
    status: 'sent',
    entity: 'reservation',
    entityId: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 35),
  },
  {
    id: 2,
    toEmail: 'admin@resort.com',
    subject: 'Payment Pending – Reservation #2',
    template: 'payment_pending',
    status: 'sent',
    entity: 'payment',
    entityId: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 3,
    toEmail: 'maria.santos@email.com',
    subject: 'Check-in Reminder – Garden Suite Today',
    template: 'check_in_reminder',
    status: 'sent',
    entity: 'reservation',
    entityId: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: 4,
    toEmail: 'admin@resort.com',
    subject: 'New Reservation – Family Villa',
    template: 'new_reservation',
    status: 'failed',
    entity: 'reservation',
    entityId: 4,
    errorMessage: 'RESEND_API_KEY not configured',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 5,
    toEmail: 'pedro.reyes@email.com',
    subject: 'Payment Verified – Your stay is confirmed',
    template: 'payment_verified',
    status: 'sent',
    entity: 'payment',
    entityId: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

export const mockNotifications: AppNotification[] = [
  {
    id: 1,
    type: 'new_reservation',
    title: 'New Reservation',
    message: 'John Smith booked Deluxe Ocean View for Jul 10–15.',
    entity: 'reservation',
    entityId: 1,
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  },
  {
    id: 2,
    type: 'payment_pending',
    title: 'Payment Pending',
    message: 'Payment of ₱12,500 is awaiting verification for Reservation #2.',
    entity: 'payment',
    entityId: 2,
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hrs ago
  },
  {
    id: 3,
    type: 'check_in_today',
    title: 'Check-in Today',
    message: 'Maria Santos is scheduled to check in today (Garden Suite).',
    entity: 'reservation',
    entityId: 3,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hrs ago
  },
  {
    id: 4,
    type: 'payment_verified',
    title: 'Payment Verified',
    message: 'Payment of ₱8,000 for Reservation #4 has been confirmed.',
    entity: 'payment',
    entityId: 4,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: 5,
    type: 'low_availability',
    title: 'Low Availability',
    message: 'Only 1 room remaining for the Jul 20–25 period.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];