import { Reservation } from '../types';

export class NotificationService {
  /**
   * Send reservation confirmation
   */
  async sendConfirmation(reservation: Reservation, restaurantName: string): Promise<void> {
    // Mock implementation - logs to console
    // In production, integrate with SendGrid, Twilio, etc.
    console.log('\n📧 EMAIL NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${reservation.customer_name} <${reservation.customer_phone}>`);
    console.log(`Subject: Reservation Confirmed at ${restaurantName}`);
    console.log('');
    console.log(`Dear ${reservation.customer_name},`);
    console.log('');
    console.log('Your reservation has been confirmed!');
    console.log('');
    console.log(`Restaurant: ${restaurantName}`);
    console.log(`Date: ${reservation.reservation_date}`);
    console.log(`Time: ${reservation.reservation_time}`);
    console.log(`Party Size: ${reservation.party_size} guests`);
    console.log(`Duration: ${reservation.duration_hours} hours`);
    console.log(`Reservation ID: ${reservation.id}`);
    console.log('');
    console.log('We look forward to seeing you!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Simulate SMS
    console.log('📱 SMS NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${reservation.customer_phone}`);
    console.log(`Message: Your reservation at ${restaurantName} is confirmed for ${reservation.reservation_date} at ${reservation.reservation_time}. Party of ${reservation.party_size}. Ref: ${reservation.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Send reservation update notification
   */
  async sendUpdateNotification(
    reservation: Reservation,
    restaurantName: string,
    changes: string[]
  ): Promise<void> {
    console.log('\n📧 UPDATE NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${reservation.customer_name} <${reservation.customer_phone}>`);
    console.log(`Subject: Reservation Updated at ${restaurantName}`);
    console.log('');
    console.log(`Dear ${reservation.customer_name},`);
    console.log('');
    console.log('Your reservation has been updated:');
    console.log('');
    changes.forEach(change => console.log(`  • ${change}`));
    console.log('');
    console.log('Updated Details:');
    console.log(`  Date: ${reservation.reservation_date}`);
    console.log(`  Time: ${reservation.reservation_time}`);
    console.log(`  Party Size: ${reservation.party_size} guests`);
    console.log(`  Reservation ID: ${reservation.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Send cancellation notification
   */
  async sendCancellation(reservation: Reservation, restaurantName: string): Promise<void> {
    console.log('\n📧 CANCELLATION NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${reservation.customer_name} <${reservation.customer_phone}>`);
    console.log(`Subject: Reservation Cancelled at ${restaurantName}`);
    console.log('');
    console.log(`Dear ${reservation.customer_name},`);
    console.log('');
    console.log('Your reservation has been cancelled:');
    console.log('');
    console.log(`  Restaurant: ${restaurantName}`);
    console.log(`  Date: ${reservation.reservation_date}`);
    console.log(`  Time: ${reservation.reservation_time}`);
    console.log(`  Reservation ID: ${reservation.id}`);
    console.log('');
    console.log('We hope to see you again soon!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Send reminder notification (future feature)
   */
  async sendReminder(reservation: Reservation, restaurantName: string): Promise<void> {
    console.log('\n🔔 REMINDER NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${reservation.customer_name}`);
    console.log(`Reminder: Your reservation at ${restaurantName} is tomorrow at ${reservation.reservation_time}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

export default new NotificationService();