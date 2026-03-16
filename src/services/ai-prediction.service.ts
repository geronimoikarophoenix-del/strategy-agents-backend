import https from 'https';
import { logger } from '../utils/logger';

/**
 * AI Prediction Market Service
 * Analyzes Bitcoin/Ethereum/Solana 1-hour prediction markets
 * Uses Groq to predict probability of outcomes
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface PredictionOpportunity {
  asset: string; // BTC, ETH, SOL
  currentPrice: number;
  marketPrice: number; // What market is pricing
  timeframe: string; // "1h"
  type: 'above' | 'below'; // Is price going above or below market?
  gap: number; // Price difference %
  momentum: number; // 1h momentum % 
  volatility: number; // Current 1h volatility
  rsi: number; // RSI indicator
  volume: number; // Trading volume trend
}

interface PredictionAnalysis {
  asset: string;
  prediction: 'above' | 'below';
  probability: number; // 0-100, e.g., 78% chance above
  confidence: number; // 0-1 for our filtering
  reasoning: string;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedPayoff: string; // "2-5x if correct"
}

export class AIPredictionService {
  /**
   * Analyze if price will go above/below market price
   */
  static async analyzePriceGap(opportunity: PredictionOpportunity): Promise<PredictionAnalysis> {
    return new Promise((resolve) => {
      const prompt = `You are a crypto prediction market analyst. Analyze this 1-hour prediction:

Asset: ${opportunity.asset}
Current Price: $${opportunity.currentPrice}
Market Price (prediction): $${opportunity.marketPrice}
Gap: ${opportunity.gap.toFixed(2)}%
1h Momentum: ${opportunity.momentum.toFixed(2)}%
1h Volatility: ${opportunity.volatility.toFixed(2)}%
RSI: ${opportunity.rsi.toFixed(1)}
Volume Trend: ${opportunity.volume > 0 ? 'Increasing' : 'Decreasing'}

Will ${opportunity.asset} be ABOVE $${opportunity.marketPrice} in 1 hour?

Respond ONLY in JSON (no other text):
{
  "prediction": "above|below",
  "probability": <0-100>,
  "reasoning": "<2-3 sentence analysis>",
  "riskLevel": "low|medium|high"
}`;

      const postData = JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8
      });

      const options = {
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const content = result.choices[0].message.content;
            const analysis = JSON.parse(content);

            resolve({
              asset: opportunity.asset,
              prediction: analysis.prediction || 'above',
              probability: analysis.probability || 50,
              confidence: analysis.probability / 100,
              reasoning: analysis.reasoning || 'Analysis failed',
              timeframe: '1h',
              riskLevel: analysis.riskLevel || 'medium',
              expectedPayoff: analysis.probability > 75 ? '2-3x' : '1.5-2x'
            });
          } catch (e) {
            logger.error('Error parsing prediction analysis:', e);
            resolve({
              asset: opportunity.asset,
              prediction: 'above',
              probability: 50,
              confidence: 0.5,
              reasoning: 'Analysis failed',
              timeframe: '1h',
              riskLevel: 'high',
              expectedPayoff: '1-2x'
            });
          }
        });
      });

      req.on('error', (e) => {
        logger.error('Error calling Groq for prediction:', e);
        resolve({
          asset: opportunity.asset,
          prediction: 'above',
          probability: 50,
          confidence: 0.5,
          reasoning: 'API error',
          timeframe: '1h',
          riskLevel: 'high',
          expectedPayoff: '1-2x'
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Analyze momentum-based prediction
   */
  static async analyzeMomentumPrediction(opportunity: PredictionOpportunity): Promise<PredictionAnalysis> {
    const prompt = `Momentum prediction for ${opportunity.asset}:

Current Price: $${opportunity.currentPrice}
1h Price Change: ${opportunity.momentum.toFixed(2)}%
1h Volatility: ${opportunity.volatility.toFixed(2)}%
RSI: ${opportunity.rsi.toFixed(1)}
Volume: ${opportunity.volume > 0 ? 'Strong' : 'Weak'}

Is momentum strong enough to sustain or reverse?
Will price stay ${opportunity.momentum > 0 ? 'above' : 'below'} current in next 1h?

Respond ONLY in JSON:
{
  "prediction": "above|below",
  "probability": <0-100>,
  "reasoning": "<momentum analysis>",
  "riskLevel": "low|medium|high"
}`;

    return this.callGroqPrediction(opportunity.asset, prompt);
  }

  /**
   * Analyze volatility crush prediction
   */
  static async analyzeVolatilityCrush(opportunity: PredictionOpportunity): Promise<PredictionAnalysis> {
    const prompt = `Volatility analysis for ${opportunity.asset}:

Current Price: $${opportunity.currentPrice}
Recent Volatility: ${opportunity.volatility.toFixed(2)}% (is this high?)
Gap from Market Price: ${opportunity.gap.toFixed(2)}%
RSI: ${opportunity.rsi.toFixed(1)}
Momentum: ${opportunity.momentum.toFixed(2)}%

Has volatility spiked? Will it normalize/crush?
Predict if price will move ${opportunity.momentum > 0 ? 'up' : 'down'} over next 1h.

Respond ONLY in JSON:
{
  "prediction": "above|below",
  "probability": <0-100>,
  "reasoning": "<volatility analysis>",
  "riskLevel": "low|medium|high"
}`;

    return this.callGroqPrediction(opportunity.asset, prompt);
  }

  /**
   * Generic Groq prediction call
   */
  private static async callGroqPrediction(
    asset: string,
    prompt: string
  ): Promise<PredictionAnalysis> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8
      });

      const options = {
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const content = result.choices[0].message.content;
            const analysis = JSON.parse(content);

            resolve({
              asset,
              prediction: analysis.prediction || 'above',
              probability: analysis.probability || 50,
              confidence: analysis.probability / 100,
              reasoning: analysis.reasoning || 'Analysis failed',
              timeframe: '1h',
              riskLevel: analysis.riskLevel || 'medium',
              expectedPayoff: analysis.probability > 75 ? '2-3x' : '1.5-2x'
            });
          } catch (e) {
            resolve({
              asset,
              prediction: 'above',
              probability: 50,
              confidence: 0.5,
              reasoning: 'Analysis failed',
              timeframe: '1h',
              riskLevel: 'high',
              expectedPayoff: '1-2x'
            });
          }
        });
      });

      req.on('error', () => {
        resolve({
          asset,
          prediction: 'above',
          probability: 50,
          confidence: 0.5,
          reasoning: 'API error',
          timeframe: '1h',
          riskLevel: 'high',
          expectedPayoff: '1-2x'
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Filter predictions by high probability
   */
  static filterHighProbability(
    predictions: PredictionAnalysis[],
    minProbability: number = 75
  ): PredictionAnalysis[] {
    return predictions.filter(
      p => p.probability >= minProbability && p.riskLevel !== 'high'
    );
  }

  /**
   * Generate alert for Ikaro
   */
  static generatePredictionAlert(prediction: PredictionAnalysis): string {
    return `🎯 ${prediction.asset} 1-Hour Prediction

Direction: ${prediction.prediction === 'above' ? '📈 ABOVE' : '📉 BELOW'}
Probability: ${prediction.probability}%
Risk: ${prediction.riskLevel.toUpperCase()}
Payoff: ${prediction.expectedPayoff}

📝 Analysis: ${prediction.reasoning}

⏰ Timeframe: ${prediction.timeframe}

${prediction.probability >= 75 ? '✅ HIGH CONFIDENCE - Consider taking this trade' : '⚠️ MEDIUM CONFIDENCE - Wait for confirmation'}`;
  }
}

export default AIPredictionService;
