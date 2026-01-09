import request from 'supertest';
import app from '../../src/app';

describe('Reservation API', () => {
  let restaurantId: number;
  let tableId: number;

  beforeAll(async () => {
    // Create restaurant
    const restaurantResponse = await request(app)
      .post('/api/v1/restaurants')
      .send({
        name: 'Reservation Test Restaurant',
        openingTime: '10:00',
        closingTime: '22:00',
        totalTables: 10
      });
    restaurantId = restaurantResponse.body.id;

    // Add table
    const tableResponse = await request(app)
      .post(`/api/v1/restaurants/${restaurantId}/tables`)
      .send({
        tableNumber: 1,
        capacity: 4
      });
    tableId = tableResponse.body.id;
  });

  describe('POST /api/v1/reservations', () => {
    it('should create a valid reservation', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        partySize: 4,
        reservationDate: '2024-02-15',
        reservationTime: '19:00',
        durationHours: 2
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_name).toBe(reservationData.customerName);
      expect(response.body.status).toBe('confirmed');
    });

    it('should prevent double booking', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'Jane Smith',
        customerPhone: '+1987654321',
        partySize: 2,
        reservationDate: '2024-02-15',
        reservationTime: '19:00', // Same time as previous test
        durationHours: 2
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should prevent overlapping reservations', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'Bob Johnson',
        customerPhone: '+1555555555',
        partySize: 3,
        reservationDate: '2024-02-15',
        reservationTime: '20:00', // Overlaps with 19:00-21:00
        durationHours: 2
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should reject party size exceeding table capacity', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'Large Party',
        customerPhone: '+1111111111',
        partySize: 10, // Table capacity is 4
        reservationDate: '2024-02-16',
        reservationTime: '18:00',
        durationHours: 2
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(400);

      expect(response.body.error.code).toBe('PARTY_SIZE_EXCEEDS_CAPACITY');
    });

    it('should reject reservation outside operating hours', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'Early Bird',
        customerPhone: '+1222222222',
        partySize: 2,
        reservationDate: '2024-02-17',
        reservationTime: '08:00', // Before 10:00 opening
        durationHours: 2
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(400);

      expect(response.body.error.code).toBe('OUTSIDE_OPERATING_HOURS');
    });

    it('should reject reservation extending past closing time', async () => {
      const reservationData = {
        restaurantId,
        tableId,
        customerName: 'Night Owl',
        customerPhone: '+1333333333',
        partySize: 2,
        reservationDate: '2024-02-18',
        reservationTime: '21:00',
        durationHours: 3 // Would end at 24:00, past 22:00 closing
      };

      const response = await request(app)
        .post('/api/v1/reservations')
        .send(reservationData)
        .expect(400);

      expect(response.body.error.code).toBe('EXTENDS_PAST_CLOSING');
    });
  });

  describe('GET /api/v1/reservations/:id', () => {
    it('should get reservation details', async () => {
      // Create reservation
      const createResponse = await request(app)
        .post('/api/v1/reservations')
        .send({
          restaurantId,
          tableId,
          customerName: 'Test User',
          customerPhone: '+1444444444',
          partySize: 2,
          reservationDate: '2024-03-01',
          reservationTime: '18:00',
          durationHours: 2
        });

      const reservationId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/reservations/${reservationId}`)
        .expect(200);

      expect(response.body.id).toBe(reservationId);
      expect(response.body.table_number).toBeDefined();
    });
  });

  describe('PUT /api/v1/reservations/:id', () => {
    it('should update reservation details', async () => {
      // Create reservation
      const createResponse = await request(app)
        .post('/api/v1/reservations')
        .send({
          restaurantId,
          tableId,
          customerName: 'Update Test',
          customerPhone: '+1555555555',
          partySize: 2,
          reservationDate: '2024-03-10',
          reservationTime: '17:00',
          durationHours: 2
        });

      const reservationId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v1/reservations/${reservationId}`)
        .send({
          partySize: 3,
          reservationTime: '18:00'
        })
        .expect(200);

      expect(response.body.party_size).toBe(3);
      expect(response.body.reservation_time).toBe('18:00');
    });
  });

  describe('DELETE /api/v1/reservations/:id', () => {
    it('should cancel reservation', async () => {
      // Create reservation
      const createResponse = await request(app)
        .post('/api/v1/reservations')
        .send({
          restaurantId,
          tableId,
          customerName: 'Cancel Test',
          customerPhone: '+1666666666',
          partySize: 2,
          reservationDate: '2024-03-15',
          reservationTime: '19:00',
          durationHours: 2
        });

      const reservationId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/v1/reservations/${reservationId}`)
        .expect(200);

      expect(response.body.message).toContain('cancelled');

      // Verify it's cancelled
      const getResponse = await request(app)
        .get(`/api/v1/reservations/${reservationId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('cancelled');
    });
  });

  describe('GET /api/v1/restaurants/:restaurantId/reservations', () => {
    it('should get all reservations for a date', async () => {
      const testDate = '2024-04-01';

      // Create multiple reservations
      await request(app)
        .post('/api/v1/reservations')
        .send({
          restaurantId,
          tableId,
          customerName: 'First Reservation',
          customerPhone: '+1777777777',
          partySize: 2,
          reservationDate: testDate,
          reservationTime: '12:00',
          durationHours: 2
        });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/reservations?date=${testDate}`)
        .expect(200);

      expect(response.body.date).toBe(testDate);
      expect(response.body.reservations).toBeInstanceOf(Array);
      expect(response.body.reservations.length).toBeGreaterThan(0);
      expect(response.body.reservations[0]).toHaveProperty('end_time');
    });
  });
});