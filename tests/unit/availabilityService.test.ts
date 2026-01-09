import availabilityService from '../../src/services/availabilityService';
import { dbRun, dbGet } from '../../src/config/database';

describe('AvailabilityService', () => {
  let restaurantId: number;
  let tableId: number;

  beforeAll(async () => {
    // Create test restaurant
    const restaurant = await dbRun(
      `INSERT INTO restaurants (name, opening_time, closing_time, total_tables) 
       VALUES (?, ?, ?, ?)`,
      ['Availability Test Restaurant', '10:00', '22:00', 10]
    );
    restaurantId = restaurant.lastID!;

    // Create test table
    const table = await dbRun(
      `INSERT INTO tables (restaurant_id, table_number, capacity) 
       VALUES (?, ?, ?)`,
      [restaurantId, 1, 4]
    );
    tableId = table.lastID!;
  });

  describe('isTableAvailable', () => {
    it('should return true for available time slot', async () => {
      const isAvailable = await availabilityService.isTableAvailable(
        tableId,
        '2024-05-01',
        '18:00',
        2
      );

      expect(isAvailable).toBe(true);
    });

    it('should return false for occupied time slot', async () => {
      // Create a reservation
      await dbRun(
        `INSERT INTO reservations 
         (restaurant_id, table_id, customer_name, customer_phone, party_size, 
          reservation_date, reservation_time, duration_hours, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [restaurantId, tableId, 'Test User', '+1234567890', 4, '2024-05-01', '19:00', 2, 'confirmed']
      );

      const isAvailable = await availabilityService.isTableAvailable(
        tableId,
        '2024-05-01',
        '19:30', // Overlaps with 19:00-21:00
        2
      );

      expect(isAvailable).toBe(false);
    });

    it('should detect time range overlaps correctly', async () => {
      // Existing reservation: 14:00-16:00
      await dbRun(
        `INSERT INTO reservations 
         (restaurant_id, table_id, customer_name, customer_phone, party_size, 
          reservation_date, reservation_time, duration_hours, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [restaurantId, tableId, 'Overlap Test', '+1111111111', 2, '2024-05-02', '14:00', 2, 'confirmed']
      );

      // Test various overlapping scenarios
      const scenarios = [
        { time: '13:00', duration: 2, expected: false }, // 13:00-15:00 overlaps
        { time: '15:00', duration: 2, expected: false }, // 15:00-17:00 overlaps
        { time: '16:00', duration: 2, expected: true },  // 16:00-18:00 no overlap (exactly after)
        { time: '12:00', duration: 1, expected: true },  // 12:00-13:00 no overlap (exactly before)
      ];

      for (const scenario of scenarios) {
        const isAvailable = await availabilityService.isTableAvailable(
          tableId,
          '2024-05-02',
          scenario.time,
          scenario.duration
        );
        expect(isAvailable).toBe(scenario.expected);
      }
    });
  });

  describe('getAvailableTables', () => {
    it('should filter tables by party size', async () => {
      // Create additional tables with different capacities
      await dbRun(
        `INSERT INTO tables (restaurant_id, table_number, capacity) VALUES (?, ?, ?)`,
        [restaurantId, 2, 2]
      );
      await dbRun(
        `INSERT INTO tables (restaurant_id, table_number, capacity) VALUES (?, ?, ?)`,
        [restaurantId, 3, 6]
      );

      const availableTables = await availabilityService.getAvailableTables(
        restaurantId,
        '2024-06-01',
        '18:00',
        2,
        5 // Party size of 5
      );

      // Should only return table with capacity >= 5
      expect(availableTables.every(t => t.capacity >= 5)).toBe(true);
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should generate time slots within operating hours', async () => {
      const slots = await availabilityService.getAvailableTimeSlots(
        restaurantId,
        '10:00',
        '22:00',
        '2024-07-01',
        4,
        2
      );

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].time).toMatch(/^\d{2}:\d{2}$/);
      expect(slots[0].availableTables).toBeGreaterThanOrEqual(0);
    });

    it('should not include slots that would extend past closing time', async () => {
      const slots = await availabilityService.getAvailableTimeSlots(
        restaurantId,
        '10:00',
        '22:00',
        '2024-07-02',
        4,
        3 // 3-hour duration
      );

      // Last possible slot should be 19:00 (19:00 + 3 hours = 22:00)
      const latestSlot = slots[slots.length - 1];
      expect(latestSlot.time <= '19:00').toBe(true);
    });
  });

  describe('findAlternativeSlots', () => {
    it('should suggest alternative times close to requested time', async () => {
      const alternatives = await availabilityService.findAlternativeSlots(
        restaurantId,
        '10:00',
        '22:00',
        '2024-08-01',
        '18:00', // Requested time
        4,
        2,
        3 // Number of alternatives
      );

      expect(alternatives.length).toBeLessThanOrEqual(3);
      // Should not include the requested time
      expect(alternatives.every(slot => slot.time !== '18:00')).toBe(true);
    });
  });
});