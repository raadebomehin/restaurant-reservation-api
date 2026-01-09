import request from 'supertest';
import app from '../../src/app';

describe('Restaurant API', () => {
  describe('POST /api/v1/restaurants', () => {
    it('should create a new restaurant', async () => {
      const restaurantData = {
        name: 'Test Restaurant',
        openingTime: '10:00',
        closingTime: '22:00',
        totalTables: 15
      };

      const response = await request(app)
        .post('/api/v1/restaurants')
        .send(restaurantData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(restaurantData.name);
      expect(response.body.opening_time).toBe(restaurantData.openingTime);
      expect(response.body.closing_time).toBe(restaurantData.closingTime);
      expect(response.body.total_tables).toBe(restaurantData.totalTables);
    });

    it('should reject invalid time format', async () => {
      const restaurantData = {
        name: 'Test Restaurant',
        openingTime: '25:00', // Invalid
        closingTime: '22:00',
        totalTables: 15
      };

      const response = await request(app)
        .post('/api/v1/restaurants')
        .send(restaurantData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject opening time after closing time', async () => {
      const restaurantData = {
        name: 'Test Restaurant',
        openingTime: '22:00',
        closingTime: '10:00', // Before opening
        totalTables: 15
      };

      const response = await request(app)
        .post('/api/v1/restaurants')
        .send(restaurantData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TIME_RANGE');
    });
  });

  describe('GET /api/v1/restaurants/:id', () => {
    it('should get restaurant details with tables', async () => {
      // Create restaurant first
      const createResponse = await request(app)
        .post('/api/v1/restaurants')
        .send({
          name: 'Get Test Restaurant',
          openingTime: '09:00',
          closingTime: '23:00',
          totalTables: 10
        });

      const restaurantId = createResponse.body.id;

      // Add a table
      await request(app)
        .post(`/api/v1/restaurants/${restaurantId}/tables`)
        .send({
          tableNumber: 1,
          capacity: 4
        });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body.id).toBe(restaurantId);
      expect(response.body.tables).toBeInstanceOf(Array);
      expect(response.body.tables.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/99999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/restaurants', () => {
    it('should list all restaurants', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});