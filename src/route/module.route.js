import { Router } from 'express';
import { createModule, deleteModule, getAllModules, getModuleById, updateModule } from '../controller/module.controller.js';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

router.route("/").post(verifyJWT,createModule)
router.route("/").get(verifyJWT,getAllModules);
router.route("/:id").get(verifyJWT,getModuleById);
router.route("/:id").patch(verifyJWT, updateModule);
router.route("/:id").delete(verifyJWT, deleteModule);

export default router;