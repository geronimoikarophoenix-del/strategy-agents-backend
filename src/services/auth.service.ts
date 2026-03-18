import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Authentication Service
 * Handles user registration, login, JWT token generation
 */

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: Date;
}

export interface AuthToken {
  user: User;
  token: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Register new user
   */
  static async register(
    email: string,
    username: string,
    password: string
  ): Promise<AuthToken> {
    // Validate input
    if (!email || !username || !password) {
      throw new AppError('Email, username, and password are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email or username already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      // Create user
      const result = await query(
        `INSERT INTO users (email, username, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, username, created_at`,
        [email, username, passwordHash]
      );

      const user = result.rows[0];
      const token = this.generateToken(user);

      logger.info(`User registered: ${email}`);

      return {
        user,
        token,
        expiresIn: '7d'
      };
    } catch (error) {
      logger.error('Error registering user:', error);
      
      // Log the actual error for debugging
      if (error instanceof Error) {
        logger.error(`Error details: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
      }
      
      throw new AppError('Registration failed', 500);
    }
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<AuthToken> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    try {
      logger.info(`Attempting login for: ${email}`);
      
      // Find user by email
      logger.debug(`Querying database for user: ${email}`);
      const result = await query(
        'SELECT id, email, username, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );
      logger.debug(`Query result: ${result.rows.length} rows`);

      if (result.rows.length === 0) {
        logger.warn(`Login attempt for non-existent user: ${email}`);
        throw new AppError('Invalid email or password', 401);
      }

      const user = result.rows[0];
      logger.debug(`Found user: ${user.id}`);

      // Compare passwords
      logger.debug(`Comparing passwords for user: ${email}`);
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      logger.debug(`Password match result: ${passwordMatch}`);

      if (!passwordMatch) {
        logger.warn(`Invalid password for user: ${email}`);
        throw new AppError('Invalid email or password', 401);
      }

      // Remove password from response
      delete user.password_hash;

      const token = this.generateToken(user);

      logger.info(`✅ User logged in: ${email}`);

      return {
        user,
        token,
        expiresIn: '7d'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error(`❌ Error logging in user [${email}]:`, error);
      
      // Log the actual error for debugging
      if (error instanceof Error) {
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error type: ${error.constructor.name}`);
      }
      
      throw new AppError('Login failed', 500);
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User> {
    try {
      const result = await query(
        'SELECT id, email, username, first_name, last_name, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching user', error);
      throw new AppError('Failed to fetch user', 500);
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const expiresIn = process.env.JWT_EXPIRY || '7d';

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username
      },
      secret as string,
      { expiresIn } as any
    );
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'your_secret_key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export default AuthService;
