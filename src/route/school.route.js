import {Router} from 'express'
import { verifyJWT } from '../middleware/auth.js'
import { createSchool, deleteSchool, getAllSchools, getSchool, login, logout, refreshAccessTokens, requestPasswordReset, updateSchool, updateSchoolImage } from '../controller/school.controller.js'
import upload from '../middleware/multer.middleware.js'

const router = Router()

// Authentication Routes
router.route("/admin/login").post(login)
router.route("/admin/logout").post(verifyJWT,logout)
router.route("/admin/refresh-token").post(verifyJWT,refreshAccessTokens)
router.route("/admin/password/request-token").post(requestPasswordReset)
router.route("/admin/reset-password/:token").patch(logout)

// School Management Routes
router.route("/").post(
    upload.fields([{name:"schoolImage",maxCount:1}]),
    createSchool
)
router.route("/image/:id").patch(
    verifyJWT,
    upload.fields([{name:"schoolImage",maxCount:1}]),
    updateSchoolImage
)
router.route("/:id").get(verifyJWT,getSchool)
router.route("/").get(verifyJWT,getAllSchools)
router.route("/:id").patch(verifyJWT,updateSchool)
router.route("/:id").delete(verifyJWT,deleteSchool)

export default router