import { Router } from 'express';
import { body } from 'express-validator';
import {
  createRestaurant,
  getRestaurant,
  getAllRestaurants,
  getAvailableSlots
} from '../controllers/restaurantController';
import { getRestaurantReservations } from '../controllers/reservationController';

const router = Router();

// Create restaurant
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Restaurant name is required'),
    body('openingTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Opening time must be in HH:mm format'),
    body('closingTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Closing time must be in HH:mm format'),
    body('totalTables')
      .isInt({ min: 1 })
      .withMessage('Total tables must be a positive integer')
  ],
  createRestaurant
);

// Get all restaurants
router.get('/', getAllRestaurants);

// Get restaurant by ID
router.get('/:id', getRestaurant);

// Get available time slots
router.get('/:id/available-slots', getAvailableSlots);

// Get reservations for a restaurant on a specific date
router.get('/:restaurantId/reservations', getRestaurantReservations);

export default router;