import express from "express";
import {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    assignPermissions,
    deleteRole,
    restoreRole,
    permanentDeleteRole,
    toggleRoleStatus,
    cloneRole,
    getAvailableModules
} from "../../controller/settings/roleManagement.controller.js";
import { verifyJWT } from "../../middleware/auth.js";
import { tenantModelLoader } from "../../middleware/tenantModelLoader.js";

const router = express.Router();

// Apply authentication and tenant model loading to all routes
router.use(verifyJWT);
router.use(tenantModelLoader);

// Role Management Routes

// Get available modules for permission assignment
router.route("/available-modules")
    .get(getAvailableModules);

// Create and get all roles
router.route("/")
    .post(createRole)           // Create new role
    .get(getAllRoles);          // Get all roles with pagination

// Role operations by ID
router.route("/:id")
    .get(getRoleById)           // Get role by ID with permissions
    .put(updateRole)            // Update role details
    .delete(deleteRole);        // Soft delete role

// Permission management
router.route("/:roleId/permissions")
    .put(assignPermissions);    // Assign/Update permissions to role

// Restore deleted role
router.route("/:id/restore")
    .put(restoreRole);          // Restore soft-deleted role

// Permanent delete
router.route("/:id/permanent-delete")
    .delete(permanentDeleteRole); // Permanently delete role

// Toggle status
router.route("/:id/toggle-status")
    .put(toggleRoleStatus);     // Activate/Deactivate role

// Clone role
router.route("/:id/clone")
    .post(cloneRole);           // Clone role with permissions

export default router;

