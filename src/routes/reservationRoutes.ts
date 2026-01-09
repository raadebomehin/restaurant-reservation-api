import { Router } from 'express';
import { body } from 'express-validator';
import {
  createReservation,
  getReservation,
  updateReservation,
  cancelReservation
} from '../controllers/reservationController';

const router = Router();

// Create reservation
router.post(
  '/',
  [
    body('restaurantId').isInt().withMessage('Restaurant ID must be an integer'),
    body('tableId').isInt().withMessage('Table ID must be an integer'),
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('customerPhone')
      .trim()
      .matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)
      .withMessage('Invalid phone number format'),
    body('partySize')
      .isInt({ min: 1, max: 20 })
      .withMessage('Party size must be between 1 and 20'),
    body('reservationDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('reservationTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:mm format'),
    body('durationHours')
      .optional()
      .isFloat({ min: 0.5, max: 4 })
      .withMessage('Duration must be between 0.5 and 4 hours')
  ],
  createReservation
);

// Get reservation by ID
router.get('/:id', getReservation);

// Update reservation
router.put('/:id', updateReservation);

// Cancel reservation
router.delete('/:id', cancelReservation);

export default router;