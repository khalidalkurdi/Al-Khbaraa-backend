export default () => ({
  port: Number(process.env.PORT) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'super-secret-access-token-key-change-in-prod',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'super-secret-refresh-token-key-change-in-prod',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLER_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLER_LIMIT || '100', 10),
  },
});
