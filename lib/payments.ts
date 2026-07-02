import { Payment, Reservation } from '@/types';

export type ReservationPaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid' | 'refunded';

export interface ReservationPaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  balance: number;
  percentPaid: number;
  status: ReservationPaymentStatus;
}

export const PAYMENT_STATUS_LABELS: Record<ReservationPaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  fully_paid: 'Paid',
  overpaid: 'Overpaid',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<ReservationPaymentStatus, string> = {
  unpaid: '#E57373',
  partially_paid: '#FFB74D',
  fully_paid: '#81C784',
  overpaid: '#64B5F6',
  refunded: '#BA68C8',
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  partial: 'Partial',
  balance: 'Balance',
  full: 'Full Payment',
};

export function getReservationPaymentSummary(
  reservation: Reservation,
  payments: Payment[]
): ReservationPaymentSummary {
  const totalAmount = parseFloat(String(reservation.totalAmount)) || 0;

  const reservationPayments = payments.filter(
    (p) => p.reservationId === reservation.id
  );

  const verifiedPayments = reservationPayments.filter((p) => p.status === 'verified');
  const pendingPayments = reservationPayments.filter((p) => p.status === 'pending');
  const refundedPayments = reservationPayments.filter((p) => p.status === 'refunded');

  const totalPaid = verifiedPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  const totalRefunded = refundedPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const balance = totalAmount - totalPaid;
  const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;

  let status: ReservationPaymentStatus = 'unpaid';
  if (totalRefunded > 0 && totalPaid === 0) {
    status = 'refunded';
  } else if (totalPaid >= totalAmount && totalAmount > 0) {
    status = totalPaid > totalAmount ? 'overpaid' : 'fully_paid';
  } else if (totalPaid > 0) {
    status = 'partially_paid';
  }

  return {
    totalAmount,
    totalPaid,
    totalPending,
    balance,
    percentPaid,
    status,
  };
}
