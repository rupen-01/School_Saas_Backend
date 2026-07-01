import {Router} from "express";
import { 
    createSuperAdmin, 
    getAllSchools, 
    getCurrentUser, 
    login, 
    logout, 
    refreshAccessTokens, 
    requestPasswordReset, 
    resetPassword,
    findAllModule,
    assignModulesToSchool, // Import the new function
    updateAdminImage,
    filterSuperAdmins,
    deleteAdmin
} from "../controller/superAdmin.controller.js";
import { verifyJWT } from "../middleware/auth.js";
import upload from "../middleware/multer.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([{name:"adminImage"}]),createSuperAdmin)
router.route("/login").post(login)
router.route("/filter").get(filterSuperAdmins)
router.route("/delete/:id").delete(deleteAdmin)
router.route("/update-image/:id").patch(verifyJWT,upload.fields([{name:"adminImage"}]),updateAdminImage)

// Protected Routes
router.route("/schools").get(verifyJWT, getAllSchools);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/logout").patch(verifyJWT, logout);
router.route("/refresh-token").patch(verifyJWT, refreshAccessTokens);

// Assign modules to a school
router.route("/modules").get(verifyJWT,findAllModule)
router.route("/assign-modules").post(verifyJWT, assignModulesToSchool);

// Password Reset
router.route("/password/request-token").post(requestPasswordReset)
router.route("/reset-password/:token").patch(resetPassword)

export default router