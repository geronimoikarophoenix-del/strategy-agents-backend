# Testing Guide - Full Integration Test Suite

Complete testing guide for the Strategy Agents backend. Tests cover auth, portfolio management, agents, signals, trades, P&L calculations, and real-time workflows.

---

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

### 2. Create Test Database

```bash
# Using PostgreSQL locally
createdb strategy_agents_test

# Or with Docker
docker run -d \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:14
```

### 3. Configure Environment

Copy `.env.test` and update if needed:
```bash
cp .env.test .env.test
# Edit DATABASE_URL if using different Postgres setup
```

### 4. Run Database Migrations

```bash
# For test database
npm run migrate -- --env test
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run with Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (Auto-run on file changes)
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npx jest tests/integration/auth.test.ts
```

### Run Tests Matching Pattern
```bash
npx jest --testNamePattern="should register a new user"
```

---

## Test Coverage

### Integration Tests Included

**1. Authentication (auth.test.ts)**
- ✅ User registration with validation
- ✅ Password strength requirements
- ✅ Duplicate email handling
- ✅ User login with correct credentials
- ✅ Login rejection (wrong password, non-existent user)
- ✅ JWT token generation and validation
- ✅ Protected routes (require valid token)
- ✅ Invalid token rejection
- ✅ Logout functionality

**2. Portfolio Management (portfolio.test.ts)**
- ✅ Create portfolio with valid data
- ✅ Validate required fields
- ✅ Prevent duplicate names
- ✅ Create multiple portfolios
- ✅ Get all user portfolios
- ✅ Get single portfolio by ID
- ✅ 404 for non-existent portfolio
- ✅ Update portfolio settings (partial & full)
- ✅ Track performance metrics (P&L, win rate, etc.)
- ✅ Delete portfolios
- ✅ Authorization checks (users see only their portfolios)

**3. Signal-Trade Complete Workflow (signal-trade-workflow.test.ts)**
- ✅ Generate buy/sell/close signals
- ✅ Signal validation (type, confidence, required fields)
- ✅ Get pending signals
- ✅ Approve signals
- ✅ Get signal details
- ✅ Create trades from approved signals
- ✅ List open/closed trades
- ✅ Get trade details
- ✅ **P&L Calculation** (profit case)
  - Entry: $50 @ $150.25
  - Exit: $52.80 @ $158.50
  - P&L: +$2.80 (+5.6%)
- ✅ **P&L Calculation** (loss case)
  - Entry: $100 @ $1.00
  - Exit: $98.00 @ $0.98
  - P&L: -$2.00 (-2.0%)
- ✅ Portfolio performance summary (win rate, total P&L, profit factor)
- ✅ Agent statistics (total signals, executed trades, accuracy)
- ✅ Abandon trades
- ✅ Track abandoned trades separately

### Test Statistics

```
Total Test Suites: 3
Total Tests: 50+

Auth Tests:           13
Portfolio Tests:      16
Signal-Trade Tests:   22+

Expected Coverage:
- Services:   80%+
- Controllers: 90%+
- Routes:      95%+
- Middleware:  85%+
```

---

## Test File Structure

```
tests/
├── setup.ts                          # Test environment setup
├── integration/
│   ├── auth.test.ts                 # Auth workflows
│   ├── portfolio.test.ts             # Portfolio CRUD
│   └── signal-trade-workflow.test.ts # Complete user journey
└── (unit/ - for individual functions)
```

---

## Test Database Cleanup

Tests automatically clean up after themselves:

```typescript
afterAll(async () => {
  // Delete test data created during test
  if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
});
```

**Manual cleanup if needed:**
```bash
# Reset test database
npm run migrate -- --env test --reset

# Or delete and recreate
dropdb strategy_agents_test
createdb strategy_agents_test
npm run migrate -- --env test
```

---

## Common Test Patterns

### Testing Protected Routes

```typescript
// With valid token
const response = await request(httpServer)
  .get('/api/portfolios')
  .set('Authorization', `Bearer ${authToken}`)
  .expect(200);

// Without token
const response = await request(httpServer)
  .get('/api/portfolios')
  .expect(401);
```

### Testing Error Cases

```typescript
it('should reject with 400 on missing fields', async () => {
  const response = await request(httpServer)
    .post('/api/portfolios')
    .set('Authorization', `Bearer ${authToken}`)
    .send({})
    .expect(400);

  expect(response.body.error).toBeDefined();
});
```

### Testing Data Persistence

```typescript
// Create
const createRes = await request(httpServer)
  .post('/api/portfolios')
  .send(data)
  .expect(201);

const portfolioId = createRes.body.data.portfolio.id;

// Retrieve
const getRes = await request(httpServer)
  .get(`/api/portfolios/${portfolioId}`)
  .expect(200);

expect(getRes.body.data.portfolio.id).toBe(portfolioId);
```

---

## Debugging Tests

### Enable Detailed Logging

```bash
# Run with verbose output
npx jest --verbose

# Run with additional debugging
DEBUG=* npm test
```

### Single Test Execution

```typescript
// Focus on one test
it.only('should do specific thing', async () => {
  // Only this test runs
});

// Skip a test
it.skip('should do something', async () => {
  // This test is skipped
});
```

### Inspect Database State

```typescript
it('should track portfolio metrics', async () => {
  // ... test code ...

  // Debug: check database directly
  const result = await query('SELECT * FROM portfolios WHERE id = $1', [portfolioId]);
  console.log('DB State:', result.rows[0]);
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run migrate -- --env test
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## Performance Benchmarks

**Target test execution times:**
```
Auth tests:              < 2 seconds
Portfolio tests:         < 3 seconds
Signal-trade workflow:   < 5 seconds

Total suite:             < 10 seconds
```

If tests are slower:
1. Check database connection (might be overloaded)
2. Reduce dataset size in tests
3. Use `--maxWorkers=1` to run sequentially

---

## Troubleshooting

### Test Timeout

```bash
# Increase timeout in jest.config.js
testTimeout: 30000  // 30 seconds (default: 5000)

# Or per test
it('slow test', async () => {
  // test code
}, 15000); // 15 second timeout
```

### Database Connection Errors

```bash
# Check if Postgres is running
pg_isready -h localhost -p 5432

# Check environment variables
echo $DATABASE_URL
```

### Port Already in Use

```bash
# Kill existing process
lsof -i :3001
kill -9 <PID>
```

---

## Best Practices

✅ **DO:**
- Test happy paths (success cases)
- Test error cases (validation, 404s, 401s)
- Test authorization (users see only their data)
- Clean up after tests (delete test data)
- Use descriptive test names
- Test complete workflows
- Mock external services if needed
- Keep tests isolated (don't depend on other tests)

❌ **DON'T:**
- Test implementation details
- Create hard dependencies between tests
- Leave test data in database
- Test third-party libraries
- Write overly complex tests
- Ignore flaky tests

---

## Next Steps

**After passing integration tests:**

1. ✅ Unit tests for algorithms (signal algorithms)
2. ✅ Load testing (100+ concurrent users)
3. ✅ Real market data integration (replace mock data)
4. ✅ WebSocket event testing
5. ✅ Cron job execution testing

**For production:**
1. Add security tests (SQL injection, XSS, etc.)
2. Add performance tests (p99 latency)
3. Add chaos engineering tests
4. Set up continuous testing pipeline

---

## Test Results Template

After running tests, check for:

```
PASS tests/integration/auth.test.ts
PASS tests/integration/portfolio.test.ts
PASS tests/integration/signal-trade-workflow.test.ts

Test Suites: 3 passed, 3 total
Tests:       50 passed, 50 total
Time:        8.234s
```

---

**Status:** ✅ Integration test suite ready for execution
**Next:** Run `npm test` to validate complete backend
