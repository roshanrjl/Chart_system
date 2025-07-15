import { rateLimit } from "express-rate-limit";

const messagelimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  message: { error: "you are out of messeage request please try again later" },
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).send(options.message),
});

const Loginlimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 10,
  standardHeaders: "draft-8",
  message: { error: "To many attempt try again later " },
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res.status(options.statusCode).send(options.message),
});

export {
     messagelimiter,
     Loginlimiter

     };
