import rateLimit from "express-rate-limit";

export const publicRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? "anonymous",
  standardHeaders: true,
  legacyHeaders: false
});
