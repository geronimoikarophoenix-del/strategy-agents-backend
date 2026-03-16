import { query } from '../config/database';
import SignalService from './signal.service';
import DeliveryService from './delivery.service';
import WebSocketService from './websocket.service';
import AIScannerService from './ai-scanner.service';
import { logger } from '../utils/logger';

/**
 * Scanner Service
 * Automated signal generation from market data
 * Runs periodically (via cron job)
 */

interface MarketData {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice: number;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  priceChange6h?: number;
  organicScore?: number;
  volumeSurge: number;
  priceChange: number;
  rsi: number;
  macd: number;
  volatility: number;
  liquidityRatio: number;
  holdersCount: number;
  daysOld: number;
  narrativeScore?: number;
  sentiment?: number;
}

interface SignalResult {
  signal: 'buy' | 'sell' | 'close' | null;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSizeUsd?: number;
  reasoning: string;
  expectedReturn?: number;
  aiConfidence?: number;
  aiRecommendation?: string;
  aiReasoning?: string;
}

export class ScannerService {
  /**
   * Scan all enabled agents and generate signals
   * Called by cron job every 5 minutes
   */
  static async scanAllAgents() {
    try {
      logger.info('Starting signal scanner...');
      const startTime = Date.now();

      // Get all active portfolios with enabled agents
      const portfoliosResult = await query(
        `SELECT DISTINCT p.id, p.user_id
         FROM portfolios p
         JOIN agents a ON p.id = a.portfolio_id
         WHERE p.is_active = true AND a.is_enabled = true
         LIMIT 100`
      );

      let totalSignalsGenerated = 0;

      for (const portfolio of portfoliosResult.rows) {
        const portfolioId = portfolio.id;
        const userId = portfolio.user_id;

        // Get enabled agents for portfolio
        const agentsResult = await query(
          'SELECT * FROM agents WHERE portfolio_id = $1 AND is_enabled = true',
          [portfolioId]
        );

        for (const agent of agentsResult.rows) {
          // Get mock/real market data (TODO: connect to Raydium/Orca APIs)
          const marketData = await this.getMarketData(agent.agent_type);

          if (!marketData) continue;

          // Generate signal based on agent type
          const signalResult: any = this.generateSignalForAgent(
            agent.agent_type,
            marketData
          );

          // AI Analysis: Verify signal matches agent strategy
          if (signalResult && signalResult.signal) {
            try {
              const aiAnalysis = await AIScannerService.analyzeOpportunityForAgent(
                {
                  tokenSymbol: marketData.tokenSymbol,
                  currentPrice: marketData.price || marketData.currentPrice || signalResult.entryPrice || 0,
                  mcap: marketData.marketCap || 0,
                  holders: marketData.holdersCount || 0,
                  volume24h: marketData.volume24h || 0,
                  volumeChange: marketData.volumeSurge * 100,
                  priceChange1h: marketData.priceChange || 0,
                  priceChange6h: marketData.priceChange6h || 0,
                  liquidityRatio: marketData.liquidityRatio || 0,
                  organicScore: marketData.organicScore || 50
                },
                {
                  type: agent.agent_type,
                  description: `${agent.agent_type} trading strategy`,
                  entryRules: signalResult.reasoning || 'See signal analysis',
                  exitRules: `Take profit at ${signalResult.takeProfit}, stop loss at ${signalResult.stopLoss}`,
                  targetRoi: signalResult.expectedReturn || 5,
                  maxRisk: 8
                }
              );

              // Only proceed if AI confidence >= 70% and not high risk
              if (aiAnalysis.confidence < 0.7 || aiAnalysis.riskLevel === 'high') {
                logger.info(
                  `Signal filtered by AI: ${marketData.tokenSymbol} (confidence: ${aiAnalysis.confidence}, risk: ${aiAnalysis.riskLevel})`
                );
                continue;
              }

              // Enhance signal with AI analysis
              signalResult.aiConfidence = aiAnalysis.confidence;
              signalResult.aiRecommendation = aiAnalysis.recommendation;
              signalResult.aiReasoning = aiAnalysis.reasoning;
            } catch (aiError) {
              logger.error('AI analysis error:', aiError);
              // Continue without AI if service fails
            }
          }

          if (signalResult && signalResult.signal) {
            // Create signal in database
            const signal = await SignalService.generateSignal(
              portfolioId,
              agent.id,
              agent.agent_type,
              marketData.tokenAddress,
              marketData.tokenSymbol,
              {
                signalType: signalResult.signal,
                confidence: signalResult.confidence,
                entryPrice: signalResult.entryPrice,
                stopLoss: signalResult.stopLoss,
                takeProfit: signalResult.takeProfit,
                positionSizeUsd: signalResult.positionSizeUsd,
                reasoning: `${signalResult.reasoning}${signalResult.aiReasoning ? `\n\n🤖 AI: ${signalResult.aiRecommendation?.toUpperCase()} (${(signalResult.aiConfidence * 100).toFixed(0)}%)\n${signalResult.aiReasoning}` : ''}`,
                marketData: {
                  volumeSurge: marketData.volumeSurge,
                  priceChange: marketData.priceChange,
                  rsi: marketData.rsi,
                  macd: marketData.macd
                },
                expiresAt: new Date(Date.now() + 1800000) // 30 min expiry
              }
            );

            // Deliver signal to user
            if (agent.mode === 'auto') {
              // AUTO mode: deliver and note for auto-execution
              await DeliveryService.sendSignal(
                userId,
                signal.id,
                agent.agent_type,
                marketData.tokenSymbol,
                signalResult.signal,
                signalResult.confidence,
                signalResult.reasoning,
                {
                  entryPrice: signalResult.entryPrice,
                  stopLoss: signalResult.stopLoss,
                  takeProfit: signalResult.takeProfit,
                  positionSizeUsd: signalResult.positionSizeUsd
                }
              );
            } else {
              // SCOUT mode: deliver for approval
              await DeliveryService.sendSignal(
                userId,
                signal.id,
                agent.agent_type,
                marketData.tokenSymbol,
                signalResult.signal,
                signalResult.confidence,
                signalResult.reasoning,
                {
                  entryPrice: signalResult.entryPrice,
                  stopLoss: signalResult.stopLoss,
                  takeProfit: signalResult.takeProfit,
                  positionSizeUsd: signalResult.positionSizeUsd
                }
              );
            }

            // Broadcast via WebSocket with AI analysis in reasoning
            WebSocketService.broadcastSignal(userId, portfolioId, {
              id: signal.id,
              agentType: agent.agent_type,
              tokenSymbol: marketData.tokenSymbol,
              signalType: signalResult.signal,
              confidence: signalResult.aiConfidence || signalResult.confidence,
              reasoning: signalResult.reasoning,
              entryPrice: signalResult.entryPrice,
              stopLoss: signalResult.stopLoss,
              takeProfit: signalResult.takeProfit
            });

            totalSignalsGenerated++;
          }
        }
      }

      const elapsed = Date.now() - startTime;
      logger.info(`Scanner completed: ${totalSignalsGenerated} signals generated in ${elapsed}ms`);

      return {
        success: true,
        signalsGenerated: totalSignalsGenerated,
        elapsedMs: elapsed
      };
    } catch (error) {
      logger.error('Error in signal scanner', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get market data (mock implementation, replace with real API calls)
   */
  private static async getMarketData(agentType: string): Promise<MarketData | null> {
    // TODO: Replace with real Raydium/Orca API calls
    // For now, return mock data for testing

    const tokens = [
      { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
      { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixVrtxwLatNcYF36Qjnn' },
      { symbol: 'JTO', address: 'jtojtomerl5urzzt5wemeegaxvroq3alvtwtmryrtwgx' },
    ];

    // Return mock data
    const token = tokens[Math.floor(Math.random() * tokens.length)];

    return {
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      currentPrice: 150 + Math.random() * 50,
      volumeSurge: 1.2 + Math.random() * 2,
      priceChange: -2 + Math.random() * 5,
      rsi: 20 + Math.random() * 60,
      macd: -0.5 + Math.random() * 1,
      volatility: 0.1 + Math.random() * 0.3,
      liquidityRatio: 0.5 + Math.random() * 0.5,
      holdersCount: 1000 + Math.random() * 9000,
      daysOld: Math.random() * 30
    };
  }

  /**
   * Generate signal for specific agent
   */
  private static generateSignalForAgent(
    agentType: string,
    marketData: MarketData
  ): {
    signal: 'buy' | 'sell' | 'close' | null;
    confidence: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSizeUsd?: number;
    reasoning: string;
  } | null {
    switch (agentType) {
      case 'momentum_scalp':
        return this.generateMomentumScalpSignal(marketData);
      case 'mean_reversion':
        return this.generateMeanReversionSignal(marketData);
      case 'volume_surge':
        return this.generateVolumeSurgeSignal(marketData);
      case 'ai_narrative':
        return this.generateAINarrativeSignal(marketData);
      case 'new_launch':
        return this.generateNewLaunchSignal(marketData);
      default:
        return null;
    }
  }

  private static generateMomentumScalpSignal(data: MarketData) {
    const result = SignalService.generateMomentumScalpSignal({
      volumeSurge: data.volumeSurge,
      priceChange: data.priceChange,
      rsi: data.rsi,
      macd: data.macd
    });

    if (!result.signal) return null;

    return {
      signal: result.signal,
      confidence: result.confidence,
      entryPrice: data.currentPrice,
      stopLoss: data.currentPrice * 0.9,
      takeProfit: data.currentPrice * 1.05,
      positionSizeUsd: 50,
      reasoning: result.reasoning
    };
  }

  private static generateMeanReversionSignal(data: MarketData) {
    const result = SignalService.generateMeanReversionSignal({
      priceChange: data.priceChange,
      volatility: data.volatility,
      rsi: data.rsi,
      bollingerBands: {
        lowerBand: data.priceChange,
        upperBand: -data.priceChange,
        sma: data.currentPrice
      },
      movingAverageDist: data.priceChange
    });

    if (!result.signal) return null;

    return {
      signal: result.signal,
      confidence: result.confidence,
      entryPrice: data.currentPrice,
      stopLoss: data.currentPrice * 0.92,
      takeProfit: data.currentPrice * 1.03,
      positionSizeUsd: 50,
      reasoning: result.reasoning
    };
  }

  private static generateVolumeSurgeSignal(data: MarketData) {
    const result = SignalService.generateVolumeSurgeSignal({
      volumeSurge: data.volumeSurge,
      volumeTrend: data.volumeSurge > 1.5 ? 'increasing' : 'decreasing',
      priceChange: data.priceChange,
      liquidityRatio: data.liquidityRatio
    });

    if (!result.signal) return null;

    return {
      signal: result.signal,
      confidence: result.confidence,
      entryPrice: data.currentPrice,
      stopLoss: data.currentPrice * 0.88,
      takeProfit: data.currentPrice * 1.04,
      positionSizeUsd: 50,
      reasoning: result.reasoning
    };
  }

  private static generateAINarrativeSignal(data: MarketData) {
    const result = SignalService.generateAINarrativeSignal({
      narrativeScore: 7 + Math.random() * 3,
      narrativeSentiment: 0.6 + Math.random() * 0.4,
      communityGrowth: 5 + Math.random() * 20,
      twitter: Math.floor(1000 + Math.random() * 5000),
      telegram: Math.floor(5000 + Math.random() * 20000)
    });

    if (!result.signal) return null;

    return {
      signal: result.signal,
      confidence: result.confidence,
      entryPrice: data.currentPrice,
      stopLoss: data.currentPrice * 0.85,
      takeProfit: data.currentPrice * 1.08,
      positionSizeUsd: 50,
      reasoning: result.reasoning
    };
  }

  private static generateNewLaunchSignal(data: MarketData) {
    const result = SignalService.generateNewLaunchSignal({
      launchPrice: data.currentPrice * (0.95 + Math.random() * 0.1),
      currentPrice: data.currentPrice,
      priceFromLaunch: (Math.random() - 0.5) * 30,
      initialBuyVolume: Math.floor(100000 + Math.random() * 400000),
      holdersGrowth: Math.floor(50 + Math.random() * 200),
      daysOld: data.daysOld
    });

    if (!result.signal) return null;

    return {
      signal: result.signal,
      confidence: result.confidence,
      entryPrice: data.currentPrice,
      stopLoss: data.currentPrice * 0.8,
      takeProfit: data.currentPrice * 1.1,
      positionSizeUsd: 50,
      reasoning: result.reasoning
    };
  }
}

export default ScannerService;
