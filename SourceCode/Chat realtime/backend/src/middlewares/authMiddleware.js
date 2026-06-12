import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = (req, res, next) => {
    try {
        // lay token tu header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // tach chuoi bearer nam dau

        if (!token) {
            return res.status(401).json({ message: "Không tìm thấy Access Token" });
        }

        // xac nhan token hop le
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodeUser) => {
            if (err) {
                console.error(err);
                return res.status(403).json({ message: "Access Token hết hạn hoặc không đúng" });
            }
            //tim user
            const user = await User.findById(decodeUser.userId).select("-hashedPassword");

            if (!user) {
                return res.status(404).json({ message: "Người dùng không tồn tại" });
            }
            // tra user ve trong req
            req.user = user;
            next();
        })
    } catch (error) {
        console.error("Loi khi xac minh JWT trong authmiddle", error);
        return res.status(500).json({ message: "Lỗi hệ thống-authMiddleware" });
    }
}