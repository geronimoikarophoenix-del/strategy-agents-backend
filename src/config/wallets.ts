// Wallet Configuration (No Private Keys Stored)

export const WALLETS = {
  // Ikaro's wallet for free tier profit sharing (1%)
  IKARO_PROFIT_WALLET: '4oqT7AvFRrmjyHbMsLBPcYEAYv41CWZab8dovD5Jxkqs',
  
  // Monetization Strategy (2026-03-16)
  MONETIZATION: {
    free: {
      profit_fee_percent: 1, // 1% of profits (only on profitable trades)
      description: '1% of profit (no fee on losses)',
      monthly_subscription: 0
    },
    explorer: {
      profit_fee_percent: 0, // ZERO profit fees for paid tiers
      description: 'Subscription revenue only',
      monthly_subscription: 19.99 // $19.99/month
    },
    starter: {
      profit_fee_percent: 0, // ZERO profit fees for paid tiers
      description: 'Subscription revenue only',
      monthly_subscription: 49.99 // $49.99/month
    },
    pro: {
      profit_fee_percent: 0, // ZERO profit fees for paid tiers
      description: 'Subscription revenue only',
      monthly_subscription: 149.99 // $149.99/month
    },
    pro_plus: {
      profit_fee_percent: 0, // ZERO profit fees for paid tiers
      description: 'Subscription revenue only',
      monthly_subscription: 249.99 // $249.99/month
    }
  }
};

export default WALLETS;
