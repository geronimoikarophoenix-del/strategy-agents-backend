import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Signal Service
 * Generates trading signals for each agent type
 * Does NOT execute trades - signal-only, user-custodied model
 */

export interface Signal {
  id: string;
  portfolio_id: string;
  agent_id: string;
  agent_type: string;
  token_address: string;
  token_symbol: string;
  signal_type: 'buy' | 'sell' | 'close';
  confidence: number; // 0-1 (0 = low, 1 = high)
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  position_size_usd?: number;
  reasoning: string;
  market_data?: any; // JSON object with relevant market metrics
  signal_status: 'pending' | 'approved' | 'rejected' | 'executed';
  created_at: Date;
  expires_at?: Date;
}

export class SignalService {
  /**
   * Generate signal for agent
   * Used by signal scanning/monitoring services
   */
  static async generateSignal(
    portfolioId: string,
    agentId: string,
    agentType: string,
    tokenAddress: string,
    tokenSymbol: string,
    signalData: {
      signalType: 'buy' | 'sell' | 'close';
      confidence: number;
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
      positionSizeUsd?: number;
      reasoning: string;
      marketData?: any;
      expiresAt?: Date;
    }
  ): Promise<Signal> {
    if (!portfolioId || !agentId || !tokenAddress || !tokenSymbol) {
      throw new AppError('Missing required signal fields', 400);
    }

    if (signalData.confidence < 0 || signalData.confidence > 1) {
      throw new AppError('Confidence must be between 0 and 1', 400);
    }

    try {
      const result = await query(
        `INSERT INTO signals (
          portfolio_id, agent_id, agent_type, token_address, token_symbol,
          signal_type, confidence, entry_price, stop_loss, take_profit,
          position_size_usd, reasoning, market_data, signal_status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          portfolioId, agentId, agentType, tokenAddress, tokenSymbol,
          signalData.signalType, signalData.confidence,
          signalData.entryPrice || null, signalData.stopLoss || null, signalData.takeProfit || null,
          signalData.positionSizeUsd || null, signalData.reasoning,
          signalData.marketData ? JSON.stringify(signalData.marketData) : null,
          'pending', signalData.expiresAt || null
        ]
      );

      const signal = result.rows[0];
      logger.info(`Signal generated: ${agentType} ${tokenSymbol} (${signalData.signalType})`);

      return signal;
    } catch (error) {
      logger.error('Error generating signal', error);
      throw new AppError('Failed to generate signal', 500);
    }
  }

  /**
   * Get all pending signals for portfolio
   */
  static async getPendingSignals(portfolioId: string): Promise<Signal[]> {
    try {
      const result = await query(
        `SELECT * FROM signals 
         WHERE portfolio_id = $1 AND signal_status = 'pending'
         ORDER BY created_at DESC`,
        [portfolioId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending signals', error);
      throw new AppError('Failed to fetch signals', 500);
    }
  }

  /**
   * Get signals by agent
   */
  static async getAgentSignals(agentId: string, limit: number = 50): Promise<Signal[]> {
    try {
      const result = await query(
        `SELECT * FROM signals 
         WHERE agent_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [agentId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching agent signals', error);
      throw new AppError('Failed to fetch signals', 500);
    }
  }

  /**
   * Approve signal (user confirms they want to execute)
   */
  static async approveSignal(signalId: string, portfolioId: string): Promise<Signal> {
    try {
      const result = await query(
        `UPDATE signals
         SET signal_status = 'approved'
         WHERE id = $1 AND portfolio_id = $2
         RETURNING *`,
        [signalId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Signal not found', 404);
      }

      logger.info(`Signal approved: ${signalId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error approving signal', error);
      throw new AppError('Failed to approve signal', 500);
    }
  }

  /**
   * Reject signal (user declines execution)
   */
  static async rejectSignal(signalId: string, portfolioId: string): Promise<Signal> {
    try {
      const result = await query(
        `UPDATE signals
         SET signal_status = 'rejected'
         WHERE id = $1 AND portfolio_id = $2
         RETURNING *`,
        [signalId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Signal not found', 404);
      }

      logger.info(`Signal rejected: ${signalId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error rejecting signal', error);
      throw new AppError('Failed to reject signal', 500);
    }
  }

  /**
   * Mark signal as executed (after user executes trade)
   */
  static async markExecuted(signalId: string, portfolioId: string, tradeId?: string): Promise<Signal> {
    try {
      const result = await query(
        `UPDATE signals
         SET signal_status = 'executed'
         WHERE id = $1 AND portfolio_id = $2
         RETURNING *`,
        [signalId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Signal not found', 404);
      }

      logger.info(`Signal marked executed: ${signalId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error marking signal executed', error);
      throw new AppError('Failed to mark signal executed', 500);
    }
  }

  /**
   * Get signal by ID
   */
  static async getSignal(signalId: string, portfolioId: string): Promise<Signal> {
    try {
      const result = await query(
        'SELECT * FROM signals WHERE id = $1 AND portfolio_id = $2',
        [signalId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Signal not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching signal', error);
      throw new AppError('Failed to fetch signal', 500);
    }
  }

  /**
   * Momentum Scalp Signal Algorithm
   * High-risk, short-term, volume-driven
   */
  static generateMomentumScalpSignal(marketData: any): { signal: 'buy' | 'sell' | null; confidence: number; reasoning: string } {
    const { volumeSurge, priceChange, rsi, macd } = marketData;

    // Buy if: volume spike + positive momentum + healthy RSI
    if (volumeSurge > 1.5 && priceChange > 2 && rsi > 40 && rsi < 80 && macd > 0) {
      return {
        signal: 'buy',
        confidence: Math.min(0.95, 0.6 + volumeSurge * 0.1 + priceChange * 0.05),
        reasoning: `Volume surge (${volumeSurge.toFixed(2)}x), momentum confirmed (${priceChange.toFixed(1)}%), RSI healthy (${rsi.toFixed(1)})`
      };
    }

    // Sell if: momentum fades, RSI overbought
    if (priceChange > 5 && rsi > 80) {
      return {
        signal: 'sell',
        confidence: 0.75,
        reasoning: `Strong momentum fading, RSI overbought (${rsi.toFixed(1)}), take profits`
      };
    }

    return { signal: null, confidence: 0, reasoning: 'No clear signal' };
  }

  /**
   * Mean Reversion Signal Algorithm
   * Medium-risk, defensive, dip-buying
   */
  static generateMeanReversionSignal(marketData: any): { signal: 'buy' | 'sell' | null; confidence: number; reasoning: string } {
    const { priceChange, volatility, rsi, bollingerBands, movingAverageDist } = marketData;

    // Buy if: token dipped below moving average + RSI showing oversold
    if (priceChange < -3 && rsi < 35 && bollingerBands.lowerBand > priceChange && movingAverageDist < -2) {
      return {
        signal: 'buy',
        confidence: Math.min(0.85, 0.5 + Math.abs(priceChange) * 0.1),
        reasoning: `Dip detected (${priceChange.toFixed(1)}%), oversold (RSI ${rsi.toFixed(1)}), buying opportunity`
      };
    }

    // Sell if: token recovered, moving back to MA
    if (priceChange > 2 && rsi > 70) {
      return {
        signal: 'sell',
        confidence: 0.70,
        reasoning: `Recovery confirmed, take profits (${priceChange.toFixed(1)}% gains)`
      };
    }

    return { signal: null, confidence: 0, reasoning: 'No clear mean reversion signal' };
  }

  /**
   * Volume Surge Signal Algorithm
   * Medium-high risk, opportunistic, quick exits
   */
  static generateVolumeSurgeSignal(marketData: any): { signal: 'buy' | 'sell' | null; confidence: number; reasoning: string } {
    const { volumeSurge, volumeTrend, priceChange, liquidityRatio } = marketData;

    // Buy if: massive volume spike + positive price + liquid
    if (volumeSurge > 2.0 && volumeTrend === 'increasing' && priceChange > 1 && liquidityRatio > 0.8) {
      return {
        signal: 'buy',
        confidence: Math.min(0.90, 0.65 + volumeSurge * 0.08),
        reasoning: `Massive volume surge (${volumeSurge.toFixed(2)}x), strong liquidity (${liquidityRatio.toFixed(2)}), momentum confirmed`
      };
    }

    // Sell if: volume cooling, momentum fading
    if (volumeTrend === 'decreasing' && priceChange > 3) {
      return {
        signal: 'sell',
        confidence: 0.72,
        reasoning: `Volume cooling after surge, exit with profits (${priceChange.toFixed(1)}%)`
      };
    }

    return { signal: null, confidence: 0, reasoning: 'No volume surge signal' };
  }

  /**
   * AI Narrative Signal Algorithm
   * Medium risk, theme-driven, growth tokens
   */
  static generateAINarrativeSignal(marketData: any): { signal: 'buy' | 'sell' | null; confidence: number; reasoning: string } {
    const { narrativeSentiment, narrativeScore, communityGrowth, twitter, telegram } = marketData;

    // Buy if: strong AI narrative + community engagement growing
    if (narrativeScore > 7 && narrativeSentiment > 0.6 && communityGrowth > 10) {
      return {
        signal: 'buy',
        confidence: Math.min(0.88, 0.55 + narrativeScore * 0.05),
        reasoning: `Strong AI narrative (score ${narrativeScore.toFixed(1)}), community growing (${communityGrowth.toFixed(0)}%), sentiment positive (${(narrativeSentiment * 100).toFixed(0)}%)`
      };
    }

    // Sell if: narrative hype cooling
    if (narrativeSentiment < 0.3) {
      return {
        signal: 'sell',
        confidence: 0.68,
        reasoning: `Narrative sentiment cooling (${(narrativeSentiment * 100).toFixed(0)}%), hype phase ending`
      };
    }

    return { signal: null, confidence: 0, reasoning: 'No clear AI narrative signal' };
  }

  /**
   * New Launch Signal Algorithm
   * High risk, token launches, pullback bounces
   */
  static generateNewLaunchSignal(marketData: any): { signal: 'buy' | 'sell' | null; confidence: number; reasoning: string } {
    const { launchPrice, currentPrice, priceFromLaunch, initialBuyVolume, holdersGrowth, daysOld } = marketData;

    // Buy if: token recently launched + recovering from dip + holder growth
    if (daysOld < 7 && priceFromLaunch > -20 && priceFromLaunch < -5 && holdersGrowth > 50) {
      return {
        signal: 'buy',
        confidence: Math.min(0.85, 0.6 + holdersGrowth * 0.005),
        reasoning: `New launch (${daysOld.toFixed(0)} days), pullback bounce opportunity (${priceFromLaunch.toFixed(1)}% from launch), ${holdersGrowth.toFixed(0)} new holders`
      };
    }

    // Sell if: token pumped significantly from launch
    if (priceFromLaunch > 50) {
      return {
        signal: 'sell',
        confidence: 0.75,
        reasoning: `Strong pump from launch (${priceFromLaunch.toFixed(1)}%), secure gains before correction`
      };
    }

    return { signal: null, confidence: 0, reasoning: 'No new launch signal' };
  }
}

export default SignalService;
