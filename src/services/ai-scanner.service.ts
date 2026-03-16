import { logger } from '../utils/logger';
import https from 'https';

/**
 * AI Scanner Service
 * Uses Groq AI to analyze trading opportunities
 * Integrated with each agent's strategy
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface MarketOpportunity {
  tokenSymbol: string;
  currentPrice: number;
  mcap: number;
  holders: number;
  volume24h: number;
  volumeChange: number;
  priceChange1h: number;
  priceChange6h: number;
  liquidityRatio: number;
  organicScore: number;
}

interface AgentStrategy {
  type: string; // momentum-scalp, mean-reversion, volume-surge, etc
  description: string;
  entryRules: string;
  exitRules: string;
  targetRoi: number;
  maxRisk: number;
}

interface AIAnalysis {
  opportunity: string;
  confidence: number;
  reasoning: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'skip';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedReturn: string;
}

export class AIScannerService {
  /**
   * Call Groq to analyze if opportunity fits agent strategy
   */
  static async analyzeOpportunityForAgent(
    opportunity: MarketOpportunity,
    strategy: AgentStrategy
  ): Promise<AIAnalysis> {
    return new Promise((resolve) => {
      const prompt = `Analyze this token trading opportunity for a ${strategy.type} strategy:

Token: ${opportunity.tokenSymbol}
Price: $${opportunity.currentPrice}
MCap: $${opportunity.mcap}
Holders: ${opportunity.holders}
24h Volume: $${opportunity.volume24h}
Volume Change: ${opportunity.volumeChange}%
1h Price Change: ${opportunity.priceChange1h}%
6h Price Change: ${opportunity.priceChange6h}%
Organic Score: ${opportunity.organicScore}
Liquidity Ratio: ${opportunity.liquidityRatio}

Strategy: ${strategy.type}
Entry Rules: ${strategy.entryRules}
Exit Rules: ${strategy.exitRules}
Target ROI: ${strategy.targetRoi}%
Max Risk: ${strategy.maxRisk}%

Respond in JSON format:
{
  "confidence": <0-1>,
  "recommendation": "strong_buy|buy|hold|skip",
  "reasoning": "<2-3 sentence analysis>",
  "riskLevel": "low|medium|high",
  "estimatedReturn": "<expected % return or 'N/A'>"
}

Only return valid JSON, no other text.`;

      const postData = JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
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
              opportunity: opportunity.tokenSymbol,
              confidence: analysis.confidence || 0.5,
              reasoning: analysis.reasoning || 'Analysis unavailable',
              recommendation: analysis.recommendation || 'skip',
              riskLevel: analysis.riskLevel || 'high',
              estimatedReturn: analysis.estimatedReturn || 'N/A'
            });
          } catch (e) {
            logger.error('Error parsing AI response:', e);
            resolve({
              opportunity: opportunity.tokenSymbol,
              confidence: 0,
              reasoning: 'AI analysis failed',
              recommendation: 'skip',
              riskLevel: 'high',
              estimatedReturn: 'N/A'
            });
          }
        });
      });

      req.on('error', (e) => {
        logger.error('Error calling Groq API:', e);
        resolve({
          opportunity: opportunity.tokenSymbol,
          confidence: 0,
          reasoning: 'API error',
          recommendation: 'skip',
          riskLevel: 'high',
          estimatedReturn: 'N/A'
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Analyze all opportunities and rank by AI confidence
   */
  static async rankOpportunitiesByAI(
    opportunities: MarketOpportunity[],
    strategy: AgentStrategy
  ): Promise<(MarketOpportunity & AIAnalysis)[]> {
    const analyzed: (MarketOpportunity & AIAnalysis)[] = [];

    for (const opp of opportunities) {
      const analysis = await this.analyzeOpportunityForAgent(opp, strategy);
      analyzed.push({ ...opp, ...analysis });
    }

    // Sort by confidence descending
    return analyzed.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Filter opportunities by AI recommendation
   */
  static async filterByRecommendation(
    opportunities: (MarketOpportunity & AIAnalysis)[],
    minConfidence: number = 0.7
  ): Promise<(MarketOpportunity & AIAnalysis)[]> {
    return opportunities.filter(
      opp =>
        (opp.recommendation === 'strong_buy' || opp.recommendation === 'buy') &&
        opp.confidence >= minConfidence &&
        opp.riskLevel !== 'high'
    );
  }

  /**
   * Generate AI summary for scanner report
   */
  static async generateScannerSummary(
    topOpportunities: (MarketOpportunity & AIAnalysis)[],
    agentType: string
  ): Promise<string> {
    if (topOpportunities.length === 0) {
      return `No strong ${agentType} opportunities detected. Continue monitoring.`;
    }

    const prompt = `Summarize these top ${agentType} trading opportunities in 2-3 sentences for a trader:

${topOpportunities
  .slice(0, 3)
  .map(
    (opp, i) =>
      `${i + 1}. ${opp.tokenSymbol}: ${opp.recommendation} (${(opp.confidence * 100).toFixed(0)}% confidence) - ${opp.reasoning}`
  )
  .join('\n')}

Focus on: highest conviction picks, key catalysts, and entry strategy.`;

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
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
            const summary = result.choices[0].message.content;
            resolve(summary);
          } catch (e) {
            resolve('Summary generation failed.');
          }
        });
      });

      req.on('error', () => resolve('Summary generation failed.'));
      req.write(postData);
      req.end();
    });
  }
}

export default AIScannerService;
