//controllers/authController.js
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import crypto from 'crypto';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

//Đăng ký
export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;
        // 1. Kiểm tra các trường bắt buộc
        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
        }
        // 2. Kiểm tra username đã tồn tại chưa
        const exist = await User.findOne({ username });
        if (exist) {
            return res.status(409).json({ message: "Username đã tồn tại" });
        }

        // 2.1 Kiểm tra email đã tồn tại chưa
        const existEmail = await User.findOne({ email });
        if (existEmail) {
            return res.status(409).json({ message: "Email đã tồn tại" });
        }
        // 3. Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);
        // 4. Tạo user mới và lưu vào database
        await User.create({
            username,
            hashPassword: hashedPassword,
            email,
            displayName: `${lastName} ${firstName} `
        });

        return res.sendStatus(204);

    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

//Đăng nhập
export const signIn = async (req, res) => {
    try {
        // lấy input
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Thiếu username hoặc password" });
        }

        // lấy hashedPassword
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'username hoặc password không tồn tại' })
        }

        // kiểm tra password
        const passCorrect = await bcrypt.compare(password, user.hashPassword);
        if (!passCorrect) {
            return res.status(401).json({ message: "username hoặc pass không đúng" });
        }

        // nếu khớp, tạo accessToken với jwt
        const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

        // tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');

        //  tạo session mới để lưu refresh token
        await Session.create({
            userId: user._id,
            refreshToken,
            expiredAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        //trả refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: REFRESH_TOKEN_TTL,
        });

        // trả access token về trong res
        return res.status(200).json({
            message: `User ${user.displayName} đã đăng nhập`,
            accessToken: accessToken,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

// Đăng xuất
export const signOut = async (req, res) => {
    try {
        // lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;
        if (token) {
            // xóa refresh token trong session
            await Session.deleteOne({ refreshToken: token });
            // xóa cookie
            res.clearCookie("refreshToken");
        }
        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
}

// Tao access token moi tu refresh token
export const refreshToken = async (req, res) => {
    try {
        // lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Token không tồn tại." });
        }

        // so với refresh token trong db
        const session = await Session.findOne({ refreshToken: token });

        if (!session) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        // kiểm tra tồn tại và kiểm tra thời hạn
        if (session.expiredAt < new Date()) {
            if (session) await Session.deleteOne({ refreshToken: token });
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        // truy vấn tìm thông tin User từ Database
        const user = await User.findById(session.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // tạo access token mới
        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
        );

        // return trả về cả vé mới và thông tin user
        return res.status(200).json({
            accessToken: accessToken,
            user: user
        });
    } catch (error) {
        console.error("Lỗi khi gọi refreshToken", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}