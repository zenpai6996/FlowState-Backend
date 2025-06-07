import arcjet, { shield, detectBot, tokenBucket, validateEmail} from "@arcjet/node";

// Email validation only
const emailValidator = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["ip.src"],
  rules: [
    validateEmail({
      mode: "LIVE",
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});

// Rate limiting and other protections
const rateLimiter = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["ip.src"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
      ],
    }),
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 5,
      interval: 10,
      capacity: 10,
    })
  ],
});

export { emailValidator, rateLimiter };

// For backward compatibility
export default rateLimiter;