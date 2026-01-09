import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { dbRun, dbGet, dbAll } from '../config/database';
import { Restaurant, Table } from '../types';
import { AppError, notFound, validationError } from '../middleware/errorHandler';
import availabilityService from '../services/availabilityService';
import { isValidTime } from '../utils/timeUtils';

export const createRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationError('Invalid input data', errors.array());
    }

    const { name, openingTime, closingTime, totalTables } = req.body;

    // Validate time format and logic
    if (!isValidTime(openingTime) || !isValidTime(closingTime)) {
      throw new AppError('Invalid time format. Use HH:mm', 400, 'INVALID_TIME_FORMAT');
    }

    if (openingTime >= closingTime) {
      throw new AppError(
        'Opening time must be before closing time',
        400,
        'INVALID_TIME_RANGE'
      );
    }

    const result = await dbRun(
      `INSERT INTO restaurants (name, opening_time, closing_time, total_tables) 
       VALUES (?, ?, ?, ?)`,
      [name, openingTime, closingTime, totalTables]
    );

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(restaurant);
  } catch (error) {
    next(error);
  }
};

export const getRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [id]
    );

    if (!restaurant) {
      throw notFound('Restaurant', id);
    }

    // Include tables
    const tables = await dbAll<Table>(
      'SELECT * FROM tables WHERE restaurant_id = ? ORDER BY table_number',
      [id]
    );

    res.json({
      ...restaurant,
      tables
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRestaurants = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurants = await dbAll<Restaurant>(
      'SELECT * FROM restaurants ORDER BY name'
    );

    res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, partySize, duration = 2 } = req.query;

    if (!date || !partySize) {
      throw new AppError(
        'Missing required query parameters: date, partySize',
        400,
        'MISSING_PARAMETERS'
      );
    }

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [id]
    );

    if (!restaurant) {
      throw notFound('Restaurant', id);
    }

    const availableSlots = await availabilityService.getAvailableTimeSlots(
      Number(id),
      restaurant.opening_time,
      restaurant.closing_time,
      date as string,
      Number(partySize),
      Number(duration)
    );

    res.json({
      date,
      partySize: Number(partySize),
      duration: Number(duration),
      availableSlots
    });
  } catch (error) {
    next(error);
  }
};