# Restaurant Table Reservation System

A production-ready REST API for managing restaurant table reservations with intelligent availability checking, double-booking prevention, and real-time notifications.

**Built by:** [Abdurrahman_Adebomehin]  
**Date:** January 2026  
**Tech Stack:** Node.js, TypeScript, Express, SQLite, Jest

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Setup Instructions

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd restaurant-reservation-api

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Start development server
npm run dev

# 5. Server runs at http://localhost:3000
```

### Running Tests
```bash
npm test                 # Run all tests with coverage
npm run test:watch      # Run tests in watch mode
```

### Docker Deployment
```bash
docker-compose up -d    # Start in detached mode
docker-compose logs -f  # View logs
docker-compose down     # Stop containers
```

---

## 📚 API Documentation

**Base URL:** `http://localhost:3000/api/v1`

### Restaurants

#### Create Restaurant
```http
POST /restaurants
Content-Type: application/json

{
  "name": "The Gourmet Kitchen",
  "openingTime": "10:00",
  "closingTime": "22:00",
  "totalTables": 15
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "The Gourmet Kitchen",
  "opening_time": "10:00",
  "closing_time": "22:00",
  "total_tables": 15,
  "created_at": "2026-01-09T05:39:54.000Z"
}
```

#### Get Restaurant Details
```http
GET /restaurants/:id
```

**Response (200):**
```json
{
  "id": 1,
  "name": "The Gourmet Kitchen",
  "opening_time": "10:00",
  "closing_time": "22:00",
  "total_tables": 15,
  "tables": [
    {
      "id": 1,
      "tableNumber": 1,
      "capacity": 4,
      "isAvailable": true
    }
  ]
}
```

#### List All Restaurants
```http
GET /restaurants
```

---

### Tables

#### Add Table to Restaurant
```http
POST /restaurants/:restaurantId/tables
Content-Type: application/json

{
  "tableNumber": 1,
  "capacity": 4
}
```

**Response (201):**
```json
{
  "id": 1,
  "restaurant_id": 1,
  "table_number": 1,
  "capacity": 4
}
```

#### Check Table Availability
```http
GET /restaurants/:restaurantId/tables/available?date=2026-01-15&time=19:00&duration=2&partySize=4
```

**Response (200):**
```json
{
  "available": true,
  "tables": [
    {
      "id": 1,
      "tableNumber": 1,
      "capacity": 4,
      "isOptimal": true
    },
    {
      "id": 3,
      "tableNumber": 3,
      "capacity": 6,
      "isOptimal": false
    }
  ],
  "alternativeSlots": [
    {
      "time": "18:00",
      "availableTables": 5
    }
  ]
}
```

---

### Reservations

#### Create Reservation
```http
POST /reservations
Content-Type: application/json

{
  "restaurantId": 1,
  "tableId": 1,
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "partySize": 4,
  "reservationDate": "2026-01-15",
  "reservationTime": "19:00",
  "durationHours": 2
}
```

**Response (201):**
```json
{
  "id": 1,
  "restaurant_id": 1,
  "table_id": 1,
  "customer_name": "John Doe",
  "customer_phone": "+1234567890",
  "party_size": 4,
  "reservation_date": "2026-01-15",
  "reservation_time": "19:00",
  "duration_hours": 2,
  "status": "confirmed",
  "created_at": "2026-01-09T05:44:51.000Z"
}
```

**Error Response (409 - Double Booking):**
```json
{
  "error": {
    "message": "Table is not available for the requested time slot",
    "code": "CONFLICT",
    "details": {
      "requestedTime": "19:30",
      "conflictingReservation": {
        "id": 1,
        "time": "19:00",
        "duration": 2
      }
    }
  }
}
```

#### Get Reservations for Date
```http
GET /restaurants/:restaurantId/reservations?date=2026-01-15
```

#### Update Reservation
```http
PUT /reservations/:id
Content-Type: application/json

{
  "partySize": 3,
  "reservationTime": "20:00"
}
```

#### Cancel Reservation
```http
DELETE /reservations/:id
```

#### Get Available Time Slots
```http
GET /restaurants/:restaurantId/available-slots?date=2026-01-15&partySize=4&duration=2
```

---

## 🏗️ Design Decisions & Assumptions

### Architecture Choices

**1. Service Layer Pattern**
- Separated business logic from HTTP handling
- `availabilityService`: Handles complex time slot calculations
- `tableOptimizationService`: Suggests best tables for party size
- `notificationService`: Mock email/SMS notifications (production-ready interface)

**2. Database Schema**
```
restaurants (1) ──< tables (M)
                    │
                    │
                    └──< reservations (M)
```

- **Restaurants**: Store operating hours and metadata
- **Tables**: Linked to restaurants with capacity constraints
- **Reservations**: Track bookings with status (pending/confirmed/completed/cancelled)
- **Indexes**: Composite index on (restaurant_id, table_id, reservation_date, status) for fast availability queries

**3. Time Management**
- All times stored in restaurant's local timezone
- Time slots generated in 30-minute increments (industry standard)
- Duration stored as fractional hours (e.g., 1.5 for 90 minutes)
- Overlap detection using interval arithmetic

**4. Validation Strategy**
- Input validation at route level using `express-validator`
- Business rule validation in controllers
- Database constraints for data integrity

### Key Assumptions

1. **Single Timezone**: All times in restaurant's local time (would add timezone support in production)
2. **Default Duration**: 2 hours if not specified
3. **Operating Hours**: Reservations must start AND end within operating hours
4. **Table Assignment**: System suggests optimal table but allows manual override
5. **No Walk-ins**: System only handles advance reservations
6. **No Payment**: Payment processing out of scope
7. **Cancellation**: Instant cancellation without policies (would add cancellation windows)
8. **Concurrent Bookings**: Last-write-wins (would add optimistic locking for production)

### Business Logic Highlights

**Double-Booking Prevention:**
```typescript
// Checks if two time ranges overlap
if (start1 < end2 && start2 < end1) {
  // Conflict detected
}
```

**Table Optimization:**
- Suggests smallest table that accommodates party size
- Minimizes wasted capacity
- Provides alternatives if exact match unavailable

**Operating Hours Validation:**
- Reservation start time must be within hours
- Reservation end time cannot exceed closing time
- 30-minute grace period before closing for new bookings

---

## 🔧 Known Limitations

### Current Implementation

1. **Concurrency Control**
   - No distributed locking for high-traffic scenarios
   - Potential race condition if two requests book same table simultaneously
   - **Solution**: Implement database-level locking or Redis-based distributed locks

2. **Single Timezone**
   - All times assumed to be in restaurant's timezone
   - No support for multi-timezone restaurant chains
   - **Solution**: Add timezone field to restaurants, use `moment-timezone`

3. **No Table Combining**
   - Cannot join multiple tables for large parties
   - Party size limited to single table capacity
   - **Solution**: Implement table grouping logic

4. **Basic Notification System**
   - Mock implementation (console logging)
   - No actual email/SMS integration
   - **Solution**: Integrate SendGrid (email) and Twilio (SMS)

5. **No Caching Layer**
   - Every availability check hits database
   - Could be slow under heavy load
   - **Solution**: Add Redis caching for availability queries (30-60 second TTL)

6. **No Real-time Updates**
   - No WebSocket support for live availability
   - Clients must poll for updates
   - **Solution**: Add Socket.io for real-time notifications

7. **No Waitlist**
   - When no tables available, user gets rejected
   - No option to join waitlist
   - **Solution**: Implement priority queue-based waitlist

8. **No Recurring Reservations**
   - Each booking is one-time only
   - No support for weekly/monthly bookings
   - **Solution**: Add recurrence rules (similar to iCal RRULE)

---

## 🚀 Future Improvements

### Short Term (1-2 weeks)

**Performance & Scalability:**
- [ ] Add Redis caching for availability queries
- [ ] Implement database connection pooling
- [ ] Add rate limiting per IP/user
- [ ] Optimize database queries with prepared statements

**Features:**
- [ ] Real SendGrid/Twilio integration
- [ ] Reservation reminder system (24h, 2h before)
- [ ] Customer preferences (dietary restrictions, seating preference)
- [ ] Admin dashboard for restaurant managers

**Developer Experience:**
- [ ] OpenAPI/Swagger documentation
- [ ] Postman collection
- [ ] CI/CD pipeline (GitHub Actions)

### Medium Term (1-2 months)

**Business Features:**
- [ ] Waitlist with auto-notification on cancellation
- [ ] Peak hour dynamic pricing/duration limits
- [ ] Special event handling (Valentine's Day, New Year's)
- [ ] Table blocking for maintenance/VIP
- [ ] Multi-location restaurant chain support

**Technical Improvements:**
- [ ] PostgreSQL migration for production
- [ ] Microservices architecture (separate availability service)
- [ ] Event sourcing for audit trail
- [ ] CQRS pattern for read/write separation

**Analytics:**
- [ ] Occupancy rate tracking
- [ ] No-show rate analysis
- [ ] Popular time slot identification
- [ ] Revenue forecasting

### Long Term (3-6 months)

**Advanced Features:**
- [ ] Machine learning for demand prediction
- [ ] Dynamic table allocation algorithm
- [ ] Integration with POS systems
- [ ] QR code check-in system
- [ ] Mobile app (React Native)

**Enterprise:**
- [ ] Multi-tenant architecture
- [ ] White-label solution
- [ ] Third-party integrations (OpenTable, Resy)
- [ ] Franchise management
- [ ] Loyalty program integration

---

## 📈 Scaling for Multiple Restaurants

### Current Architecture (Monolithic - Good for <10 restaurants)
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌─────────────────┐
│  Express API    │
│  (Single Node)  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  SQLite/Postgres│
│ (All restaurants)│
└─────────────────┘
```

**Pros:** Simple, easy to maintain, low overhead  
**Cons:** Single point of failure, limited scalability

---

### Scaled Architecture (Microservices - For 100+ restaurants)

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │  (Nginx/ALB) │
                    └───────┬──────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           v                v                v
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │ API Node │     │ API Node │    │ API Node │
    │  (US-E)  │     │  (US-W)  │    │   (EU)   │
    └────┬─────┘     └────┬─────┘    └────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              v                       v
       ┌─────────────┐         ┌──────────┐
       │   Redis     │         │  Message │
       │   Cluster   │         │  Queue   │
       │  (Caching)  │         │ (RabbitMQ)│
       └─────────────┘         └────┬─────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    v               v               v
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Notification │ │  Analytics   │ │  Reservation │
            │   Service    │ │   Service    │ │   Service    │
            └──────────────┘ └──────────────┘ └──────────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
          v                    v
    ┌──────────┐         ┌──────────┐
    │ Postgres │         │ Postgres │
    │  Shard 1 │         │  Shard 2 │
    │(Rest 1-50)│        │(Rest 51-100)│
    └──────────┘         └──────────┘
```

### Scaling Strategy

#### **Phase 1: Vertical Scaling (10-50 restaurants)**
- Upgrade to PostgreSQL with connection pooling
- Add Redis for caching
- Single server with more CPU/RAM

#### **Phase 2: Horizontal Scaling (50-500 restaurants)**
- Multiple API servers behind load balancer
- Database read replicas
- CDN for static assets
- Separate services:
  - **Reservation Service**: Handles bookings
  - **Availability Service**: Real-time slot checking
  - **Notification Service**: Email/SMS
  - **Analytics Service**: Reporting

#### **Phase 3: Multi-Region (500+ restaurants)**
- Geographic distribution (US-East, US-West, EU, Asia)
- Database sharding by region or restaurant ID
- Event-driven architecture with message queues
- Microservices with independent scaling

### Database Sharding Strategy

**Option 1: Shard by Restaurant ID**
```
Restaurant ID % 10 = Shard Number
- Shard 0: Restaurants 10, 20, 30...
- Shard 1: Restaurants 1, 11, 21...
```

**Option 2: Shard by Geographic Region**
```
- US-East: Restaurants in NYC, Boston, DC
- US-West: Restaurants in LA, SF, Seattle
- EU: Restaurants in London, Paris, Berlin
```

**Option 3: Dedicated DB per Restaurant Chain**
- Large chains get dedicated database
- Small restaurants share multi-tenant DB

### Caching Strategy

```typescript
// Cache Key Pattern
availability:{restaurant_id}:{date}:{time}

// TTL: 30-60 seconds
// Invalidate on: new reservation, cancellation, table status change
```

**Cache Hit Ratio Target:** 80%+  
**Cache Eviction:** LRU (Least Recently Used)

### Performance Targets

| Metric | Current | Target (Scaled) |
|--------|---------|-----------------|
| Availability Check | < 100ms | < 50ms |
| Reservation Creation | < 500ms | < 200ms |
| Concurrent Users | 100 | 10,000+ |
| Bookings/Second | 10 | 1,000+ |
| Database Queries/Sec | 50 | 10,000+ |

### Monitoring & Observability

```
┌──────────────┐
│  Prometheus  │ ← Metrics (CPU, Memory, Response Times)
└──────────────┘
        │
        v
┌──────────────┐
│   Grafana    │ ← Dashboards & Alerts
└──────────────┘

┌──────────────┐
│  ELK Stack   │ ← Log Aggregation
│ (Elasticsearch)│
└──────────────┘

┌──────────────┐
│    Jaeger    │ ← Distributed Tracing
└──────────────┘
```

**Key Metrics to Track:**
- API response times (p50, p95, p99)
- Database query performance
- Cache hit/miss rates
- Error rates by endpoint
- Booking success/failure rates
- Table utilization rates

### Cost Optimization

**Development:** $50/month (Single t3.small + SQLite)  
**Production (50 restaurants):** $500/month
- 2x t3.medium API servers
- RDS PostgreSQL (db.t3.medium)
- Redis (cache.t3.micro)
- Load balancer

**Enterprise (500 restaurants):** $5,000/month
- Auto-scaling API cluster (5-20 nodes)
- Multi-AZ RDS with read replicas
- Redis cluster
- CDN
- Monitoring tools

---

## 🧪 Testing Strategy

### Test Coverage
```
Overall: 85%+
- Controllers: 90%
- Services: 95%
- Utils: 100%
```

### Test Types
- **Unit Tests**: Business logic, utilities
- **Integration Tests**: API endpoints, database
- **Edge Case Tests**: Overlapping reservations, boundary conditions

### Running Tests
```bash
npm test                    # All tests with coverage
npm run test:watch          # Watch mode
npm test -- reservation     # Specific test file
```

---

## 📞 Contact & Support

**Developer:** [Abdurrahman_Adebomehin]  
**Email:** rahman.adebomehin@gmail.com  
**GitHub:** https://github.com/raadebomehin/restaurant-reservation-api  
**LinkedIn:** [[LinkedIn](https://www.linkedin.com/in/adebomehin/)]

---

## 📄 License

MIT License - Free to use for personal and commercial projects

---

## 🙏 Acknowledgments

Built as a pre-interview technical exercise demonstrating:
- ✅ Clean architecture and code organization
- ✅ RESTful API design principles
- ✅ Complex business logic implementation
- ✅ Production-ready error handling
- ✅ Comprehensive testing
- ✅ Scalability considerations
- ✅ Real-world problem solving

**Technologies Used:**
- Node.js 18+
- TypeScript 5.3+
- Express.js 4.18+
- SQLite3 (easily swappable to PostgreSQL)
- Jest for testing
- Docker for containerization