import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { dbRun, dbGet, dbAll } from '../config/database';
import { Restaurant, Table } from '../types';
import { AppError, notFound, validationError } from '../middleware/errorHandler';
import availabilityService from '../services/availabilityService';
import tableOptimizationService from '../services/tableOptimizationService';

export const addTable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw validationError('Invalid input data', errors.array());
    }

    const { restaurantId } = req.params;
    const { tableNumber, capacity } = req.body;

    // Verify restaurant exists
    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant) {
      throw notFound('Restaurant', restaurantId);
    }

    // Check for duplicate table number
    const existingTable = await dbGet<Table>(
      'SELECT * FROM tables WHERE restaurant_id = ? AND table_number = ?',
      [restaurantId, tableNumber]
    );

    if (existingTable) {
      throw new AppError(
        'Table number already exists for this restaurant',
        409,
        'DUPLICATE_TABLE_NUMBER',
        { tableNumber }
      );
    }

    const result = await dbRun(
      `INSERT INTO tables (restaurant_id, table_number, capacity) 
       VALUES (?, ?, ?)`,
      [restaurantId, tableNumber, capacity]
    );

    const table = await dbGet<Table>(
      'SELECT * FROM tables WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
};

export const getRestaurantTables = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant) {
      throw notFound('Restaurant', restaurantId);
    }

    const tables = await dbAll<Table>(
      'SELECT * FROM tables WHERE restaurant_id = ? ORDER BY table_number',
      [restaurantId]
    );

    res.json(tables);
  } catch (error) {
    next(error);
  }
};

export const checkTableAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const { date, time, duration = 2, partySize } = req.query;

    if (!date || !time) {
      throw new AppError(
        'Missing required query parameters: date, time',
        400,
        'MISSING_PARAMETERS'
      );
    }

    const restaurant = await dbGet<Restaurant>(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant) {
      throw notFound('Restaurant', restaurantId);
    }

    const availableTables = await availabilityService.getAvailableTables(
      Number(restaurantId),
      date as string,
      time as string,
      Number(duration),
      partySize ? Number(partySize) : undefined
    );

    let rankedTables = availableTables;
    if (partySize) {
      rankedTables = tableOptimizationService.rankTablesByOptimality(
        availableTables,
        Number(partySize)
      );
    }

    // Get alternative slots if no tables available
    let alternativeSlots = undefined;
    if (rankedTables.length === 0 && partySize) {
      alternativeSlots = await availabilityService.findAlternativeSlots(
        Number(restaurantId),
        restaurant.opening_time,
        restaurant.closing_time,
        date as string,
        time as string,
        Number(partySize),
        Number(duration)
      );
    }

    res.json({
      available: rankedTables.length > 0,
      tables: rankedTables,
      ...(alternativeSlots && { alternativeSlots })
    });
  } catch (error) {
    next(error);
  }
};