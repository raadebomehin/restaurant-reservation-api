import { Router } from 'express';
import { body } from 'express-validator';
import {
  addTable,
  getRestaurantTables,
  checkTableAvailability
} from '../controllers/tableController';

const router = Router();

// All routes here are prefixed with /api/v1/restaurants already
// So these paths are relative to that

// Add table to restaurant
router.post(
  '/:restaurantId/tables',
  [
    body('tableNumber')
      .isInt({ min: 1 })
      .withMessage('Table number must be a positive integer'),
    body('capacity')
      .isInt({ min: 1, max: 20 })
      .withMessage('Capacity must be between 1 and 20')
  ],
  addTable
);

// Get all tables for a restaurant
router.get('/:restaurantId/tables', getRestaurantTables);

// Check table availability
router.get('/:restaurantId/tables/available', checkTableAvailability);

export default router;