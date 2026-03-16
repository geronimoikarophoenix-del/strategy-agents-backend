import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Agent Service
 * Handles agent configuration, enabling/disabling, mode switching, settings updates
 */

export interface Agent {
  id: string;
  portfolio_id: string;
  agent_type: string;
  agent_name: string;
  mode: 'auto' | 'scout';
  is_enabled: boolean;
  max_trade_size_usd?: number;
  max_daily_budget_usd?: number;
  max_daily_trades?: number;
  stop_loss_pct?: number;
  take_profit_pct?: number;
  max_concurrent_positions: number;
  max_hold_time_hours?: number;
  use_staged_exits: boolean;
  staged_exit_1_pct: number;
  staged_exit_1_sell_pct: number;
  staged_exit_2_pct: number;
  staged_exit_2_sell_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate?: number;
  total_pnl: number;
  last_scan_at?: Date;
  last_trade_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Default agent configurations
const AGENT_DEFAULTS = {
  momentum_scalp: {
    agent_name: 'Momentum Scalp',
    mode: 'auto',
    max_concurrent_positions: 1,
    use_staged_exits: true,
    staged_exit_1_pct: 5,
    staged_exit_1_sell_pct: 0.5,
    staged_exit_2_pct: 10,
    staged_exit_2_sell_pct: 0.25
  },
  mean_reversion: {
    agent_name: 'Mean Reversion',
    mode: 'auto',
    max_concurrent_positions: 1,
    use_staged_exits: true,
    staged_exit_1_pct: 5,
    staged_exit_1_sell_pct: 0.5,
    staged_exit_2_pct: 10,
    staged_exit_2_sell_pct: 0.25
  },
  volume_surge: {
    agent_name: 'Volume Surge',
    mode: 'auto',
    max_concurrent_positions: 1,
    use_staged_exits: true,
    staged_exit_1_pct: 5,
    staged_exit_1_sell_pct: 0.5,
    staged_exit_2_pct: 10,
    staged_exit_2_sell_pct: 0.25
  },
  ai_narrative: {
    agent_name: 'AI Narrative',
    mode: 'auto',
    max_concurrent_positions: 1,
    use_staged_exits: true,
    staged_exit_1_pct: 8,
    staged_exit_1_sell_pct: 0.5,
    staged_exit_2_pct: 15,
    staged_exit_2_sell_pct: 0.25
  },
  new_launch: {
    agent_name: 'New Launch',
    mode: 'auto',
    max_concurrent_positions: 1,
    use_staged_exits: true,
    staged_exit_1_pct: 10,
    staged_exit_1_sell_pct: 0.5,
    staged_exit_2_pct: 20,
    staged_exit_2_sell_pct: 0.25
  },
  sports_scout: {
    agent_name: 'Sports Scout',
    mode: 'scout',
    max_concurrent_positions: 2,
    use_staged_exits: false,
    staged_exit_1_pct: 0,
    staged_exit_1_sell_pct: 0,
    staged_exit_2_pct: 0,
    staged_exit_2_sell_pct: 0
  },
  social_events_scout: {
    agent_name: 'Social Events Scout',
    mode: 'scout',
    max_concurrent_positions: 1,
    use_staged_exits: false,
    staged_exit_1_pct: 0,
    staged_exit_1_sell_pct: 0,
    staged_exit_2_pct: 0,
    staged_exit_2_sell_pct: 0
  },
  crypto_markets_scout: {
    agent_name: 'Crypto Markets Scout',
    mode: 'scout',
    max_concurrent_positions: 2,
    use_staged_exits: false,
    staged_exit_1_pct: 0,
    staged_exit_1_sell_pct: 0,
    staged_exit_2_pct: 0,
    staged_exit_2_sell_pct: 0
  }
};

export class AgentService {
  /**
   * Configure agent for portfolio
   */
  static async configureAgent(
    portfolioId: string,
    agentType: string,
    overrides?: Partial<Agent>
  ): Promise<Agent> {
    if (!portfolioId || !agentType) {
      throw new AppError('Portfolio ID and agent type are required', 400);
    }

    // Get default config for agent type
    const defaults = (AGENT_DEFAULTS as any)[agentType];
    if (!defaults) {
      throw new AppError(`Invalid agent type: ${agentType}`, 400);
    }

    try {
      const result = await query(
        `INSERT INTO agents (
          portfolio_id, agent_type, agent_name, mode, is_enabled,
          max_concurrent_positions, use_staged_exits,
          staged_exit_1_pct, staged_exit_1_sell_pct,
          staged_exit_2_pct, staged_exit_2_sell_pct,
          total_trades, winning_trades, losing_trades, total_pnl
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          portfolioId, agentType, defaults.agent_name, defaults.mode, true,
          defaults.max_concurrent_positions, defaults.use_staged_exits,
          defaults.staged_exit_1_pct, defaults.staged_exit_1_sell_pct,
          defaults.staged_exit_2_pct, defaults.staged_exit_2_sell_pct,
          0, 0, 0, 0
        ]
      );

      logger.info(`Agent configured: ${agentType} for portfolio ${portfolioId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error configuring agent', error);
      throw new AppError('Failed to configure agent', 500);
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgent(agentId: string, portfolioId: string): Promise<Agent> {
    try {
      const result = await query(
        'SELECT * FROM agents WHERE id = $1 AND portfolio_id = $2',
        [agentId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Agent not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching agent', error);
      throw new AppError('Failed to fetch agent', 500);
    }
  }

  /**
   * Get all agents for portfolio
   */
  static async getPortfolioAgents(portfolioId: string): Promise<Agent[]> {
    try {
      const result = await query(
        'SELECT * FROM agents WHERE portfolio_id = $1 ORDER BY created_at ASC',
        [portfolioId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching portfolio agents', error);
      throw new AppError('Failed to fetch agents', 500);
    }
  }

  /**
   * Change agent mode (auto <-> scout)
   */
  static async changeMode(
    agentId: string,
    portfolioId: string,
    mode: 'auto' | 'scout'
  ): Promise<Agent> {
    if (!['auto', 'scout'].includes(mode)) {
      throw new AppError('Invalid mode. Must be "auto" or "scout"', 400);
    }

    try {
      const result = await query(
        'UPDATE agents SET mode = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND portfolio_id = $3 RETURNING *',
        [mode, agentId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Agent not found', 404);
      }

      logger.info(`Agent ${agentId} mode changed to ${mode}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error changing agent mode', error);
      throw new AppError('Failed to change mode', 500);
    }
  }

  /**
   * Enable/disable agent
   */
  static async toggleAgent(agentId: string, portfolioId: string, enabled: boolean): Promise<Agent> {
    try {
      const result = await query(
        'UPDATE agents SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND portfolio_id = $3 RETURNING *',
        [enabled, agentId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Agent not found', 404);
      }

      logger.info(`Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error toggling agent', error);
      throw new AppError('Failed to toggle agent', 500);
    }
  }

  /**
   * Update agent settings
   */
  static async updateSettings(
    agentId: string,
    portfolioId: string,
    settings: Partial<Agent>
  ): Promise<Agent> {
    const allowedFields = [
      'max_trade_size_usd', 'max_daily_budget_usd', 'max_daily_trades',
      'stop_loss_pct', 'take_profit_pct', 'max_concurrent_positions',
      'max_hold_time_hours', 'use_staged_exits',
      'staged_exit_1_pct', 'staged_exit_1_sell_pct',
      'staged_exit_2_pct', 'staged_exit_2_sell_pct'
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updateValues.push(agentId, portfolioId);

    try {
      const query_str = `
        UPDATE agents
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND portfolio_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(query_str, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Agent not found', 404);
      }

      logger.info(`Agent ${agentId} settings updated`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating agent settings', error);
      throw new AppError('Failed to update settings', 500);
    }
  }

  /**
   * Update agent performance metrics
   */
  static async updatePerformance(
    agentId: string,
    totalTrades: number,
    winningTrades: number,
    losingTrades: number,
    totalPnL: number
  ): Promise<Agent> {
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) : 0;

    try {
      const result = await query(
        `UPDATE agents
         SET total_trades = $1,
             winning_trades = $2,
             losing_trades = $3,
             total_pnl = $4,
             win_rate = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [totalTrades, winningTrades, losingTrades, totalPnL, winRate, agentId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Agent not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating agent performance', error);
      throw new AppError('Failed to update performance', 500);
    }
  }
}

export default AgentService;
