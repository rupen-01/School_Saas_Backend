import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import asynchandler from "../utils/asyncHandler.js";

export const verifyJWT = asynchandler(async (req, _, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const { User } = req.app.locals.models;
    const user = await User.findByPk(decodedToken.id, {
        attributes: { exclude: ["password", "refreshToken"] }
    });

    if (!user) {
        throw new ApiError(401, "Invalid token");
    }

    req.user = user;
    next();
});