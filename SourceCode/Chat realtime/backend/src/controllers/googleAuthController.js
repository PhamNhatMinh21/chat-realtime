import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5002/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

// 1: Redirect người dùng tới Google
export const googleRedirect = (req, res) => {
    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
    });

    res.redirect(authUrl);
};

// Google callback sau khi người dùng xác nhận
export const googleCallback = async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
        console.error('[GoogleOAuth] Người dùng từ chối hoặc lỗi:', error);
        return res.redirect(`${FRONTEND_URL}/login?error=google_denied`);
    }

    try {
        const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

        // Đổi authorization code lấy tokens
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // Lấy thông tin user từ Google
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const { sub: googleId, email, name, picture } = payload;

        // Tìm hoặc tạo user
        let user = await User.findOne({ googleId });

        if (!user) {
            // Kiểm tra email đã tồn tại chưa (tài khoản thường)
            user = await User.findOne({ email });

            if (user) {
                // Liên kết tài khoản Google với tài khoản hiện có
                user.googleId = googleId;
                if (!user.avatarUrl && picture) user.avatarUrl = picture;
                await user.save();
            } else {
                // Tạo user mới từ Google
                // username = phần trước @ của email + 4 ký tự random để tránh trùng
                const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const suffix = crypto.randomBytes(2).toString('hex');
                const username = `${baseUsername}_${suffix}`;

                user = await User.create({
                    username,
                    googleId,
                    email,
                    displayName: name || baseUsername,
                    avatarUrl: picture || null,
                });
            }
        }

        // Tạo Access Token + Refresh Token (giống signIn thường)
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = crypto.randomBytes(64).toString('hex');

        await Session.create({
            userId: user._id,
            refreshToken,
            expiredAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        // Set refresh token vào cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL,
        });

        // Redirect về frontend, kèm accessToken trong query param (tạm thời)
        // Frontend sẽ lấy token này và lưu vào localStorage
        return res.redirect(
            `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(accessToken)}`
        );

    } catch (err) {
        console.error('[GoogleOAuth] Lỗi callback:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
    }
};
