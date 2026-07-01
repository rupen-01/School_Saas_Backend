import { Router } from 'express';
import staffSettingsRoutes from './staffSettings.route.js';
import academicYearRoutes from '../academicYear/academicYear.route.js';
import comprehensiveMasterDataRoutes from './comprehensiveMasterData.route.js';
import roleManagementRoutes from './roleManagement.route.js';

const router = Router();

// Staff Settings Routes (for leave policies and other staff-specific settings)
router.use('/staff', staffSettingsRoutes);

// Academic Year Settings Routes
router.use('/academic-year', academicYearRoutes);

// Comprehensive Master Data Settings Routes (Classes, Sections, Subjects, Houses, Departments, Leave Types)
router.use('/masterdata', comprehensiveMasterDataRoutes);

// Role Management Routes
router.use('/roles', roleManagementRoutes);

// Future settings routes can be added here
// router.use('/school', schoolSettingsRoutes);
// router.use('/payroll', payrollSettingsRoutes);

export default router;
