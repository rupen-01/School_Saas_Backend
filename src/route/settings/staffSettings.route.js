import { Router } from 'express';
import { verifyJWT } from '../../middleware/auth.js';
import { tenantModelLoader } from '../../middleware/tenantModelLoader.js';
import {
    // Overview
    getSettingsOverview
} from '../../controller/settings/staffSettings.controller.js';

const router = Router();

// Apply authentication and tenant model loading to all routes
router.use(verifyJWT);
router.use(tenantModelLoader);

// ==================== SETTINGS OVERVIEW ====================
router.route('/overview').get(getSettingsOverview);

export default router;