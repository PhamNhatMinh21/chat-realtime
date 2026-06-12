import Redis from "ioredis";

let redisClient = null;

// Hàm khởi tạo và lấy kết nối tới máy chủ Redis.
export const getRedisClient = () => {
    if (!redisClient) {
        redisClient = new Redis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || "0"),
            // Tự động thử kết nối lại khi mất mạng
            retryStrategy(times) {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
            lazyConnect: false,
            enableOfflineQueue: false,
        });

        redisClient.on("connect", () => {
            console.log("✅ Redis đã kết nối thành công");
        });

        redisClient.on("error", (err) => {
            console.error("❌ Redis lỗi kết nối:", err.message);
        });
    }
    return redisClient;
};

// Lưu dữ liệu dạng JSON vào Cache với thời gian hết hạn (TTL) tính bằng giây.
export const cacheSet = async (key, value, ttlSeconds = 300) => {
    try {
        const client = getRedisClient();
        await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
        console.error(`[Redis Cache] Lỗi set key=${key}:`, err.message);
    }
};

// Lấy dữ liệu dạng JSON từ Cache theo Key.
export const cacheGet = async (key) => {
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error(`[Redis Cache] Lỗi get key=${key}:`, err.message);
        return null;
    }
};

// Xóa một hoặc nhiều Key khỏi Cache.
export const cacheDel = async (...keys) => {
    try {
        const client = getRedisClient();
        if (keys.length > 0) {
            await client.del(...keys);
        }
    } catch (err) {
        console.error(`[Redis Cache] Lỗi del:`, err.message);
    }
};

// Xóa các Key khớp với mẫu biểu thức tìm kiếm.
export const cacheDelPattern = async (pattern) => {
    try {
        const client = getRedisClient();
        const keys = [];
        let cursor = "0";
        do {
            const [nextCursor, found] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = nextCursor;
            keys.push(...found);
        } while (cursor !== "0");

        if (keys.length > 0) {
            await client.del(...keys);
        }
    } catch (err) {
        console.error(`[Redis Cache] Lỗi del pattern=${pattern}:`, err.message);
    }
};
