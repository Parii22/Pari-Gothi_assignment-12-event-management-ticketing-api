const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for ticket booking to prevent ticket-scalping bots.
 * Limit: 10 requests per minute per IP address.
 */
const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per windowMs
  standardHeaders: true, // Return standard rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res /*, next, options */) => {
    res.status(429).json({
      success: false,
      message: 'Too many booking attempts, try again later.'
    });
  }
});

module.exports = {
  bookingRateLimiter
};
