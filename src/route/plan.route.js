import { Router } from "express";
import { 
    createPlan, 
    deletePlan, 
    getPlan, 
    getPlanById, 
    updatePlan, 
    restorePlan,
    hardDeletePlan,
    removeModuleFromPlan
} from "../controller/plan.controller.js";
import { verifyJWT } from "../middleware/auth.js";
import multer from "multer";

const upload = multer();

const router = Router();

// Plan CRUD operations
router.route("/").post(upload.none(), createPlan);
router.route("/").get(verifyJWT, getPlan);
router.route("/:id").get(verifyJWT, getPlanById);
router.route("/:id").patch(verifyJWT, upload.none(), updatePlan);

// Soft delete
router.route("/:id").delete(verifyJWT, deletePlan);

// Restore soft deleted plan
router.route("/:id/restore").post(verifyJWT, restorePlan);

// Hard delete (permanent)
router.route("/:id/hard-delete").delete(verifyJWT, hardDeletePlan);

// Remove specific module from plan
router.route("/:planId/module/:moduleId").delete(verifyJWT, removeModuleFromPlan);

export default router;