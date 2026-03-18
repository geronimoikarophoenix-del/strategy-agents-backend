import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Use DATABASE_URL if set, otherwise use known Railway PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:fpugSIPLZjhktxKrIDPfEOPOCssSnapK@caboose.proxy.rlwy.net:40362/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  logger.info('Database connected');
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const getClient = async () => {
  return await pool.connect();
};

export default pool;
