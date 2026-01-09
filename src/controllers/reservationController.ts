import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { dbRun, dbGet, dbAll } from '../config/database';
import { Reservation, Restaurant, Table, ReservationWithDetails } from '../types';
import { AppError, notFound, validationError, conflictError } from '../middleware/errorHandler';
import availabilityService from '../services/availabilityService';
import notificationService from '../services/notificationService';
import { addHours, isTimeBetween, timeToMinutes } from '../utils/timeUtils';

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationError('Invalid input data', errors.array());
    }

    const {
      restaurantId,
      tableId,
      customerName,
      customerPhone,
      partySize,
      reservationDate,
      reservationTime,
      durationHours = 2
    } = req.body;

    // Verify restaurant exists
    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant) {
      throw notFound('Restaurant', restaurantId);
    }

    // Verify table exists and belongs to restaurant
    const table = await dbGet<Table>(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [tableId, restaurantId]
    );

    if (!table) {
      throw notFound('Table', tableId);
    }

    // Check table capacity
    if (partySize > table.capacity) {
      throw new AppError(
        `Party size (${partySize}) exceeds table capacity (${table.capacity})`,
        400,
        'PARTY_SIZE_EXCEEDS_CAPACITY',
        {
          partySize,
          tableCapacity: table.capacity,
          suggestedAction: 'Please select a larger table or reduce party size'
        }
      );
    }

    // Validate reservation is within operating hours
    const reservationEnd = addHours(reservationTime, durationHours);
    
    if (!isTimeBetween(reservationTime, restaurant.opening_time, restaurant.closing_time)) {
      throw new AppError(
        'Reservation time is outside restaurant operating hours',
        400,
        'OUTSIDE_OPERATING_HOURS',
        {
          requestedTime: reservationTime,
          operatingHours: `${restaurant.opening_time} - ${restaurant.closing_time}`
        }
      );
    }

    if (timeToMinutes(reservationEnd) > timeToMinutes(restaurant.closing_time)) {
      throw new AppError(
        'Reservation duration extends past closing time',
        400,
        'EXTENDS_PAST_CLOSING',
        {
          reservationEnd,
          closingTime: restaurant.closing_time
        }
      );
    }

    // Check table availability (prevent double booking)
    const isAvailable = await availabilityService.isTableAvailable(
      tableId,
      reservationDate,
      reservationTime,
      durationHours
    );

    if (!isAvailable) {
      // Find conflicting reservation for better error message
      const conflicting = await dbGet<Reservation>(
        `SELECT * FROM reservations 
         WHERE table_id = ? 
         AND reservation_date = ? 
         AND status IN ('confirmed', 'pending')
         ORDER BY reservation_time`,
        [tableId, reservationDate]
      );

      throw conflictError(
        'Table is not available for the requested time slot',
        {
          requestedTime: reservationTime,
          requestedDuration: durationHours,
          conflictingReservation: conflicting ? {
            id: conflicting.id,
            time: conflicting.reservation_time,
            duration: conflicting.duration_hours
          } : null
        }
      );
    }

    // Create reservation
    const result = await dbRun(
      `INSERT INTO reservations 
       (restaurant_id, table_id, customer_name, customer_phone, party_size, 
        reservation_date, reservation_time, duration_hours, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurantId,
        tableId,
        customerName,
        customerPhone,
        partySize,
        reservationDate,
        reservationTime,
        durationHours,
        'confirmed'
      ]
    );

    const reservation = await dbGet<Reservation>(
      'SELECT * FROM reservations WHERE id = ?',
      [result.lastID]
    );

    // Send confirmation notification
    await notificationService.sendConfirmation(reservation!, restaurant.name);

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

export const getReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const reservation = await dbGet<ReservationWithDetails>(
      `SELECT r.*, t.table_number 
       FROM reservations r 
       JOIN tables t ON r.table_id = t.id 
       WHERE r.id = ?`,
      [id]
    );

    if (!reservation) {
      throw notFound('Reservation', id);
    }

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

export const getRestaurantReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;

    if (!date) {
      throw new AppError('Missing required query parameter: date', 400, 'MISSING_PARAMETER');
    }

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant) {
      throw notFound('Restaurant', restaurantId);
    }

    const reservations = await dbAll<ReservationWithDetails>(
      `SELECT r.*, t.table_number 
       FROM reservations r 
       JOIN tables t ON r.table_id = t.id 
       WHERE r.restaurant_id = ? AND r.reservation_date = ? 
       AND r.status IN ('confirmed', 'pending')
       ORDER BY r.reservation_time`,
      [restaurantId, date]
    );

    // Add end time to each reservation
    const reservationsWithEnd = reservations.map(r => ({
      ...r,
      end_time: addHours(r.reservation_time, r.duration_hours)
    }));

    res.json({
      date,
      restaurantName: restaurant.name,
      reservations: reservationsWithEnd
    });
  } catch (error) {
    next(error);
  }
};

export const updateReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await dbGet<Reservation>(
      'SELECT * FROM reservations WHERE id = ?',
      [id]
    );

    if (!existing) {
      throw notFound('Reservation', id);
    }

    if (existing.status === 'cancelled') {
      throw new AppError(
        'Cannot update a cancelled reservation',
        400,
        'RESERVATION_CANCELLED'
      );
    }

    // Track changes for notification
    const changes: string[] = [];

    // If time or date is being changed, check availability
    if (updates.reservationTime || updates.reservationDate) {
      const newDate = updates.reservationDate || existing.reservation_date;
      const newTime = updates.reservationTime || existing.reservation_time;
      const newDuration = updates.durationHours || existing.duration_hours;

      const isAvailable = await availabilityService.isTableAvailable(
        existing.table_id,
        newDate,
        newTime,
        newDuration
      );

      if (!isAvailable) {
        throw conflictError('Table is not available for the new time slot');
      }

      if (updates.reservationDate) changes.push(`Date changed to ${newDate}`);
      if (updates.reservationTime) changes.push(`Time changed to ${newTime}`);
    }

    if (updates.partySize) changes.push(`Party size changed to ${updates.partySize}`);
    if (updates.durationHours) changes.push(`Duration changed to ${updates.durationHours} hours`);

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      updateFields.push(`${snakeKey} = ?`);
      updateValues.push(updates[key]);
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await dbRun(
      `UPDATE reservations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updated = await dbGet<Reservation>(
      'SELECT * FROM reservations WHERE id = ?',
      [id]
    );

    // Send update notification
    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [updated!.restaurant_id]
    );

    if (changes.length > 0) {
      await notificationService.sendUpdateNotification(updated!, restaurant!.name, changes);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const cancelReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const reservation = await dbGet<Reservation>(
      'SELECT * FROM reservations WHERE id = ?',
      [id]
    );

    if (!reservation) {
      throw notFound('Reservation', id);
    }

    if (reservation.status === 'cancelled') {
      throw new AppError(
        'Reservation is already cancelled',
        400,
        'ALREADY_CANCELLED'
      );
    }

    await dbRun(
      `UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );

    // Send cancellation notification
    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [reservation.restaurant_id]
    );

    await notificationService.sendCancellation(reservation, restaurant!.name);

    res.json({
      message: 'Reservation cancelled successfully',
      reservationId: id
    });
  } catch (error) {
    next(error);
  }
};