import { dbAll } from '../config/database';
import { Reservation, Table, TimeSlot } from '../types';
import {
  addHours,
  doTimeRangesOverlap,
  generateTimeSlots,
  timeToMinutes
} from '../utils/timeUtils';

export class AvailabilityService {
  /**
   * Check if a specific table is available for a given time slot
   */
  async isTableAvailable(
    tableId: number,
    date: string,
    startTime: string,
    durationHours: number
  ): Promise<boolean> {
    const endTime = addHours(startTime, durationHours);

    const conflictingReservations = await dbAll<Reservation>(
      `SELECT * FROM reservations 
       WHERE table_id = ? 
       AND reservation_date = ? 
       AND status IN ('confirmed', 'pending')`,
      [tableId, date]
    );

    for (const reservation of conflictingReservations) {
      const reservationEnd = addHours(
        reservation.reservation_time,
        reservation.duration_hours
      );

      if (
        doTimeRangesOverlap(
          startTime,
          endTime,
          reservation.reservation_time,
          reservationEnd
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all available tables for a restaurant at a specific time
   */
  async getAvailableTables(
    restaurantId: number,
    date: string,
    startTime: string,
    durationHours: number,
    partySize?: number
  ): Promise<Table[]> {
    let query = `SELECT * FROM tables WHERE restaurant_id = ? AND is_available = 1`;
    const params: any[] = [restaurantId];

    if (partySize) {
      query += ` AND capacity >= ?`;
      params.push(partySize);
    }

    const tables = await dbAll<Table>(query, params);
    const availableTables: Table[] = [];

    for (const table of tables) {
      const isAvailable = await this.isTableAvailable(
        table.id!,
        date,
        startTime,
        durationHours
      );

      if (isAvailable) {
        availableTables.push(table);
      }
    }

    return availableTables;
  }

  /**
   * Get available time slots for a given date and party size
   */
  async getAvailableTimeSlots(
    restaurantId: number,
    openingTime: string,
    closingTime: string,
    date: string,
    partySize: number,
    durationHours: number
  ): Promise<TimeSlot[]> {
    // Generate slots every 30 minutes
    const slots = generateTimeSlots(openingTime, closingTime, 30);
    const availableSlots: TimeSlot[] = [];

    for (const slot of slots) {
      // Make sure the reservation can finish before closing
      const endTime = addHours(slot, durationHours);
      if (timeToMinutes(endTime) > timeToMinutes(closingTime)) {
        continue;
      }

      const availableTables = await this.getAvailableTables(
        restaurantId,
        date,
        slot,
        durationHours,
        partySize
      );

      if (availableTables.length > 0) {
        availableSlots.push({
          time: slot,
          availableTables: availableTables.length
        });
      }
    }

    return availableSlots;
  }

  /**
   * Find alternative time slots if requested slot is unavailable
   */
  async findAlternativeSlots(
    restaurantId: number,
    openingTime: string,
    closingTime: string,
    date: string,
    requestedTime: string,
    partySize: number,
    durationHours: number,
    numAlternatives: number = 3
  ): Promise<TimeSlot[]> {
    const allSlots = await this.getAvailableTimeSlots(
      restaurantId,
      openingTime,
      closingTime,
      date,
      partySize,
      durationHours
    );

    // Find slots closest to requested time
    const requestedMinutes = timeToMinutes(requestedTime);
    
    return allSlots
      .filter(slot => slot.time !== requestedTime)
      .sort((a, b) => {
        const diffA = Math.abs(timeToMinutes(a.time) - requestedMinutes);
        const diffB = Math.abs(timeToMinutes(b.time) - requestedMinutes);
        return diffA - diffB;
      })
      .slice(0, numAlternatives);
  }
}

export default new AvailabilityService();