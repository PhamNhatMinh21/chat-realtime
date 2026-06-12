//route/authRoute.js
import express from "express";
import { signOut, signIn, signUp, refreshToken } from "../controllers/authController.js";
import { googleRedirect, googleCallback } from "../controllers/googleAuthController.js";

const router = express.Router();

router.post("/signup", signUp);

router.post("/signin", signIn);

router.post("/signout", signOut);

router.post("/refresh", refreshToken);

router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);

export default router;