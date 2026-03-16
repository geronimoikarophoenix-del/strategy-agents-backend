import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { httpServer } from '../../src/app';
import { query } from '../../src/config/database';

/**
 * Integration Tests: Complete Signal → Trade → P&L Workflow
 * Full user journey from signal generation to trade closing and metrics
 */

describe('Signal-Trade Workflow Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let portfolioId: string;
  let agentId: string;
  let signalId: string;
  let tradeId: string;

  const testUser = {
    email: 'workflow-test@example.com',
    username: 'workflowtest',
    password: 'SecurePassword123'
  };

  beforeAll(async () => {
    // Register user
    const registerRes = await request(httpServer)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerRes.body.data.token;
    userId = registerRes.body.data.user.id;

    // Create portfolio
    const portfolioRes = await request(httpServer)
      .post('/api/portfolios')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Workflow Test Portfolio',
        tier: 'free'
      });

    portfolioId = portfolioRes.body.data.portfolio.id;

    // Configure agent
    const agentRes = await request(httpServer)
      .post(`/api/portfolios/${portfolioId}/agents`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        agent_type: 'momentum_scalp'
      });

    agentId = agentRes.body.data.agent.id;
  });

  afterAll(async () => {
    if (portfolioId) await query('DELETE FROM portfolios WHERE id = $1', [portfolioId]);
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('Signal Generation', () => {
    it('should generate buy signal for agent', async () => {
      const response = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent_id: agentId,
          agent_type: 'momentum_scalp',
          token_address: 'So11111111111111111111111111111111111111112',
          token_symbol: 'SOL',
          signal_type: 'buy',
          confidence: 0.82,
          entry_price: 150.25,
          stop_loss: 142.50,
          take_profit: 165.00,
          position_size_usd: 50,
          reasoning: 'Volume surge (3.2x), RSI healthy (58), momentum confirmed',
          market_data: {
            volumeSurge: 3.2,
            priceChange: 2.5,
            rsi: 58,
            macd: 0.32
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal).toBeDefined();
      expect(response.body.data.signal.signal_type).toBe('buy');
      expect(response.body.data.signal.confidence).toBe(0.82);
      expect(response.body.data.signal.token_symbol).toBe('SOL');
      expect(response.body.data.signal.signal_status).toBe('pending');

      signalId = response.body.data.signal.id;
    });

    it('should get pending signals for portfolio', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.signals)).toBe(true);
      expect(response.body.data.signals.length).toBeGreaterThan(0);

      const signal = response.body.data.signals.find((s: any) => s.id === signalId);
      expect(signal).toBeDefined();
      expect(signal.signal_status).toBe('pending');
    });

    it('should reject invalid signal type', async () => {
      const response = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent_id: agentId,
          agent_type: 'momentum_scalp',
          token_address: 'So11111...',
          token_symbol: 'SOL',
          signal_type: 'invalid',
          confidence: 0.82,
          reasoning: 'Test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid confidence (>1)', async () => {
      const response = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent_id: agentId,
          agent_type: 'momentum_scalp',
          token_address: 'So11111...',
          token_symbol: 'SOL',
          signal_type: 'buy',
          confidence: 1.5,
          reasoning: 'Test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Signal Approval', () => {
    it('should approve pending signal', async () => {
      const response = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}/signals/${signalId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal.signal_status).toBe('approved');
    });

    it('should get signal details', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/signals/${signalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal.id).toBe(signalId);
      expect(response.body.data.signal.signal_status).toBe('approved');
    });
  });

  describe('Trade Creation from Signal', () => {
    it('should create trade from approved signal', async () => {
      const response = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/trades`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signal_id: signalId,
          agent_id: agentId,
          token_address: 'So11111111111111111111111111111111111111112',
          token_symbol: 'SOL',
          entry_price: 150.25,
          entry_amount_usd: 50,
          stop_loss_price: 142.50,
          take_profit_price: 165.00,
          notes: 'Bought on volume surge signal'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trade).toBeDefined();
      expect(response.body.data.trade.status).toBe('open');
      expect(response.body.data.trade.entry_price).toBe(150.25);
      expect(response.body.data.trade.entry_amount_usd).toBe(50);
      expect(response.body.data.trade.pnl).toBeNull();

      tradeId = response.body.data.trade.id;
    });

    it('should get open trades', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/trades?status=open`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.trades)).toBe(true);
      expect(response.body.data.trades.length).toBeGreaterThan(0);

      const trade = response.body.data.trades.find((t: any) => t.id === tradeId);
      expect(trade).toBeDefined();
      expect(trade.status).toBe('open');
    });

    it('should get single trade details', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/trades/${tradeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trade.id).toBe(tradeId);
      expect(response.body.data.trade.status).toBe('open');
    });
  });

  describe('P&L Calculation', () => {
    it('should close trade with profit', async () => {
      const response = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}/trades/${tradeId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exit_price: 158.50,
          exit_amount_usd: 52.80
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trade.status).toBe('closed');
      expect(response.body.data.trade.exit_price).toBe(158.50);
      expect(response.body.data.trade.exit_amount_usd).toBe(52.80);

      // P&L = 52.80 - 50 = 2.80
      // P&L % = (2.80 / 50) * 100 = 5.6%
      expect(response.body.data.trade.pnl).toBe(2.80);
      expect(response.body.data.trade.pnl_percent).toBeCloseTo(5.6, 1);
    });

    it('should track closed trades', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/trades?status=closed`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades.length).toBeGreaterThan(0);

      const closedTrade = response.body.data.trades.find((t: any) => t.id === tradeId);
      expect(closedTrade).toBeDefined();
      expect(closedTrade.status).toBe('closed');
      expect(closedTrade.pnl).toBe(2.80);
    });

    it('should close trade with loss', async () => {
      // Create another signal & trade
      const signalRes = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent_id: agentId,
          agent_type: 'momentum_scalp',
          token_address: 'EPjFWaLb3odcccccccccccccccccccccccccccccccc',
          token_symbol: 'USDC',
          signal_type: 'buy',
          confidence: 0.65,
          entry_price: 1.0,
          reasoning: 'Test losing trade'
        });

      const signal2Id = signalRes.body.data.signal.id;

      const tradeRes = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/trades`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signal_id: signal2Id,
          agent_id: agentId,
          token_address: 'EPjFWaLb3odcccccccccccccccccccccccccccccccc',
          token_symbol: 'USDC',
          entry_price: 1.00,
          entry_amount_usd: 100
        });

      const trade2Id = tradeRes.body.data.trade.id;

      // Close with loss
      const closeRes = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}/trades/${trade2Id}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exit_price: 0.98,
          exit_amount_usd: 98.0
        })
        .expect(200);

      expect(closeRes.body.data.trade.pnl).toBe(-2.0);
      expect(closeRes.body.data.trade.pnl_percent).toBeCloseTo(-2.0, 1);
    });
  });

  describe('Portfolio Performance', () => {
    it('should calculate portfolio performance summary', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();

      const summary = response.body.data.summary;
      expect(summary.totalTrades).toBeGreaterThan(0);
      expect(summary.winningTrades).toBeGreaterThanOrEqual(0);
      expect(summary.losingTrades).toBeGreaterThanOrEqual(0);
      expect(typeof summary.winRate).toBe('number');
      expect(typeof summary.totalPnL).toBe('number');
    });

    it('should calculate agent statistics', async () => {
      const response = await request(httpServer)
        .get(`/api/agents/${agentId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();

      const stats = response.body.data.stats;
      expect(stats.totalSignals).toBeGreaterThan(0);
      expect(stats.executedTrades).toBeGreaterThan(0);
      expect(typeof stats.winRate).toBe('number');
      expect(typeof stats.totalPnL).toBe('number');
      expect(typeof stats.profitFactor).toBe('number');
    });
  });

  describe('Trade Abandonment', () => {
    it('should abandon a trade', async () => {
      // Create new trade
      const signalRes = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent_id: agentId,
          agent_type: 'momentum_scalp',
          token_address: 'So11111...',
          token_symbol: 'SOL',
          signal_type: 'buy',
          confidence: 0.70,
          reasoning: 'Test abandon'
        });

      const tradeRes = await request(httpServer)
        .post(`/api/portfolios/${portfolioId}/trades`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signal_id: signalRes.body.data.signal.id,
          agent_id: agentId,
          token_address: 'So11111...',
          token_symbol: 'SOL',
          entry_price: 150.0,
          entry_amount_usd: 50
        });

      const abandonTradeId = tradeRes.body.data.trade.id;

      // Abandon trade
      const response = await request(httpServer)
        .put(`/api/portfolios/${portfolioId}/trades/${abandonTradeId}/abandon`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trade.status).toBe('abandoned');
    });

    it('should track abandoned trades separately', async () => {
      const response = await request(httpServer)
        .get(`/api/portfolios/${portfolioId}/trades?status=abandoned`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trades.length).toBeGreaterThan(0);
      expect(response.body.data.trades[0].status).toBe('abandoned');
    });
  });
});
