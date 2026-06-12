import { getRedisClient } from "../libs/redis.js";

/**
 * Middleware giới hạn tần suất request (Rate Limiter) dựa trên Redis
 * @param {Object} options
 * @param {number} options.windowSeconds  - Khoảng thời gian tính (giây), mặc định 60
 * @param {number} options.maxRequests    - Số request tối đa trong window, mặc định 60
 * @param {string} options.keyPrefix      - Tiền tố key Redis, mặc định 'rl'
 */
export const rateLimiter = ({
    windowSeconds = 60,
    maxRequests = 60,
    keyPrefix = "rl",
} = {}) => {
    return async (req, res, next) => {
        try {
            const client = getRedisClient();

            // Dùng IP làm identifier (có thể đổi sang userId nếu đã auth)
            const identifier = req.ip || req.socket.remoteAddress;
            const key = `${keyPrefix}:${identifier}`;

            // Dùng INCR để đếm, tự động tạo key nếu chưa có
            const count = await client.incr(key);

            // Lần đầu tiên → set TTL
            if (count === 1) {
                await client.expire(key, windowSeconds);
            }

            // Lấy TTL còn lại để trả về header
            const ttl = await client.ttl(key);

            // Set các header chuẩn Rate Limit
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));
            res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + ttl);

            if (count > maxRequests) {
                return res.status(429).json({
                    message: `Quá nhiều request. Vui lòng thử lại sau ${ttl} giây.`,
                    retryAfter: ttl,
                });
            }

            next();
        } catch (err) {
            console.error("[RateLimiter] Redis error, bypassing:", err.message);
            next();
        }
    };
};
