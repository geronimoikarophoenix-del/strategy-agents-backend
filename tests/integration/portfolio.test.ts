import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { httpServer } from '../../src/app';
import { query } from '../../src/config/database';

/**
 * Integration Tests: Portfolio Management
 * Tests portfolio CRUD, metrics tracking, and tier management
 */

describe('Portfolio Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let portfolioId: string;
  let portfolioId2: string;

  const testUser = {
    email: 'portfolio-test@example.com',
    username: 'portfoliotest',
    password: 'SecurePassword123'
  };

  const portfolio1 = {
    name: 'My Trading Portfolio',
    description: 'Conservative strategy mix',
    overall_risk_level: 'moderate',
    tier: 'free'
  };

  const portfolio2 = {
    name: 'Aggressive Portfolio',
    description: 'High-risk, high-reward',
    overall_risk_level: 'aggressive',
    tier: 'free'
  };

  beforeAll(async () => {
    // Register test user
    const registerRes = await request(httpServer)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerRes.body.data.token;
    userId = registerRes.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup
    if (portfolioId) await query('DELETE FROM portfolios WHERE id = $1', [portfolioId]);
    if (portfolioId2) await query('DELETE FROM portfolios WHERE id = $1', [portfolioId2]);
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('Portfolio Creation', () => {
    it('should create portfolio with valid data', async () => {
      const response = await request(httpServer)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolio1)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio).toBeDefined();
      expect(response.body.data.portfolio.name).toBe(portfolio1.name);
      expect(response.body.data.portfolio.tier).toBe('free');
      expect(response.body.data.portfolio.is_active).toBe(true);
      expect(response.body.data.portfolio.is_trading).toBe(true);

      portfolioId = response.body.data.portfolio.id;
    });

    it('should reject portfolio without name', async () => {
      const response = await request(httpServer)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name',
          tier: 'free'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject duplicate portfolio names', async () => {
      const response = await request(httpServer)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolio1)
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should create multiple portfolios', async () => {
      const response = await request(httpServer)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(portfolio2)
        .expect(201);

      expect(response.body.success).toBe(true);
      portfolioId2 = response.body.data.portfolio.id;
    });
  });

  describe('Portfolio Retrieval', () => {
    it('should get all user portfolios', async () => {
      const response = await request(httpServer)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.portfolios)).toBe(true);
      expect(response.body.data.portfolios.length).toBeGreaterThanOrEqual(2);

      const names = response.body.data.portfolios.map((p: any) => p.name);
      expect(names).toContain(portfolio1.name);
      expect(names).toContain(portfolio2.name);
    });

    it('should get single portfolio by ID', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio.id).toBe(portfolioId);
      expect(response.body.data.portfolio.name).toBe(portfolio1.name);
      expect(response.body.data.portfolio.signals_sent_today).toBe(0);
      expect(response.body.data.portfolio.signals_sent_lifetime).toBe(0);
      expect(response.body.data.portfolio.daily_pnl).toBe(0);
      expect(response.body.data.portfolio.lifetime_pnl).toBe(0);
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(httpServer)
        .get('/api/portfolios/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Portfolio Updates', () => {
    it('should update portfolio settings', async () => {
      const updates = {
        overall_risk_level: 'aggressive',
        is_trading: false
      };

      const response = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio.overall_risk_level).toBe('aggressive');
      expect(response.body.data.portfolio.is_trading).toBe(false);
    });

    it('should handle partial updates', async () => {
      const response = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio.description).toBe('Updated description');
    });
  });

  describe('Portfolio Performance Metrics', () => {
    it('should track portfolio metrics', async () => {
      // Update metrics
      await query(
        `UPDATE portfolios
         SET signals_sent_today = 5,
             signals_sent_lifetime = 45,
             signal_accuracy = 0.62,
             daily_pnl = 45.23,
             weekly_pnl = 120.50,
             monthly_pnl = 250.75,
             lifetime_pnl = 1250.50,
             win_rate = 0.62,
             total_user_trades = 21
         WHERE id = $1`,
        [portfolioId]
      );

      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const p = response.body.data.portfolio;
      expect(p.signals_sent_today).toBe(5);
      expect(p.signals_sent_lifetime).toBe(45);
      expect(p.daily_pnl).toBe(45.23);
      expect(p.lifetime_pnl).toBe(1250.50);
      expect(p.win_rate).toBe(0.62);
      expect(p.total_user_trades).toBe(21);
    });
  });

  describe('Portfolio Deletion', () => {
    it('should delete portfolio', async () => {
      const response = await request(httpServer)
        .delete(`/api/portfolios/${portfolioId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const getRes = await request(httpServer)
        .get(`/api/portfolios/${portfolioId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getRes.body.error).toBeDefined();
    });

    it('should reject deletion of non-existent portfolio', async () => {
      const response = await request(httpServer)
        .delete('/api/portfolios/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Authorization Checks', () => {
    it('should reject portfolio access without token', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should only return user\'s own portfolios', async () => {
      // Create another user
      const otherUser = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'otheruser@example.com',
          username: 'otheruser',
          password: 'SecurePassword123'
        });

      const otherToken = otherUser.body.data.token;
      const otherUserId = otherUser.body.data.user.id;

      // Try to access first user's portfolio
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();

      // Cleanup
      await query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });
});
