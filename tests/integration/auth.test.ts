import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { httpServer } from '../../src/app';
import { query } from '../../src/config/database';

/**
 * Integration Tests: Authentication Flow
 * Tests user registration, login, JWT tokens, and protected endpoints
 */

describe('Auth Integration Tests', () => {
  let authToken: string;
  let userId: string;
  const testUser = {
    email: 'testuser@example.com',
    username: 'testuser123',
    password: 'SecurePassword123',
    firstName: 'Test',
    lastName: 'User'
  };

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresIn).toBe('7d');

      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          username: 'anotheruser'
          // Missing password
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should reject password with < 8 characters', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'shortpass@example.com',
          username: 'shortpass',
          password: 'Short1!'
        })
        .expect(400);

      expect(response.body.error.message).toContain('8 characters');
    });
  });

  describe('User Login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);

      authToken = response.body.data.token;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body.error.message).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123'
        })
        .expect(401);

      expect(response.body.error.message).toContain('Invalid');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({
          email: testUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('JWT Token & Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const response = await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject protected route without token', async () => {
      const response = await request(httpServer)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject protected route with malformed auth header', async () => {
      const response = await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const response = await request(httpServer)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });
  });
});
