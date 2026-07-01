import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== UTILITY FUNCTIONS ====================

// UUID validation
const validateUUID = (id, fieldName = "ID") => {
    if (!id || typeof id !== 'string') {
        throw new ApiError(400, `Invalid ${fieldName} format`);
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        throw new ApiError(400, `Invalid ${fieldName} format`);
    }
    
    return true;
};

// Validate role name
const validateRoleName = (name) => {
    if (!name?.trim()) {
        throw new ApiError(400, "Role name is required");
    }
    
    if (name.trim().length < 3 || name.trim().length > 100) {
        throw new ApiError(400, "Role name must be between 3 and 100 characters");
    }
    
    return name.trim();
};

// Validate role code
const validateRoleCode = (code) => {
    if (!code?.trim()) {
        throw new ApiError(400, "Role code is required");
    }
    
    const codeRegex = /^[A-Z_]+$/;
    if (!codeRegex.test(code.trim())) {
        throw new ApiError(400, "Role code must be uppercase letters and underscores only (e.g., CLASS_TEACHER)");
    }
    
    if (code.trim().length < 2 || code.trim().length > 50) {
        throw new ApiError(400, "Role code must be between 2 and 50 characters");
    }
    
    return code.trim().toUpperCase();
};

// Validate permissions array (hierarchical structure)
const validatePermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        throw new ApiError(400, "Permissions must be an array");
    }
    
    const booleanFields = ['can_view', 'can_create', 'can_update', 'can_delete', 'can_export', 'can_approve'];
    
    // Check for required fields in each permission
    for (let i = 0; i < permissions.length; i++) {
        const perm = permissions[i];
        
        if (!perm.module_id) {
            throw new ApiError(400, `Permission at index ${i}: module_id is required`);
        }
        
        validateUUID(perm.module_id, `module_id at index ${i}`);
        
        // Validate module_permissions
        if (!perm.module_permissions || typeof perm.module_permissions !== 'object') {
            throw new ApiError(400, `Permission at index ${i}: module_permissions is required and must be an object`);
        }
        
        booleanFields.forEach(field => {
            if (typeof perm.module_permissions[field] !== 'boolean') {
                throw new ApiError(400, `Permission at index ${i}: module_permissions.${field} must be a boolean`);
            }
        });
        
        // Validate sub_module_permissions if present
        if (perm.sub_module_permissions && Array.isArray(perm.sub_module_permissions)) {
            perm.sub_module_permissions.forEach((subPerm, j) => {
                if (!subPerm.sub_module_id) {
                    throw new ApiError(400, `Permission at index ${i}, sub-module ${j}: sub_module_id is required`);
                }
                
                validateUUID(subPerm.sub_module_id, `sub_module_id at index ${i}, sub-module ${j}`);
                
                if (!subPerm.permissions || typeof subPerm.permissions !== 'object') {
                    throw new ApiError(400, `Permission at index ${i}, sub-module ${j}: permissions is required and must be an object`);
                }
                
                booleanFields.forEach(field => {
                    if (typeof subPerm.permissions[field] !== 'boolean') {
                        throw new ApiError(400, `Permission at index ${i}, sub-module ${j}: permissions.${field} must be a boolean`);
                    }
                });
            });
        }
    }
    
    return permissions;
};

// Convert hierarchical permissions to flat array for database storage
const flattenPermissions = (permissions, roleId, userId) => {
    const flatPermissions = [];
    
    permissions.forEach(perm => {
        // Add module-level permission
        flatPermissions.push({
            role_id: roleId,
            module_id: perm.module_id,
            sub_module_id: null,
            can_view: perm.module_permissions.can_view,
            can_create: perm.module_permissions.can_create,
            can_update: perm.module_permissions.can_update,
            can_delete: perm.module_permissions.can_delete,
            can_export: perm.module_permissions.can_export,
            can_approve: perm.module_permissions.can_approve,
            created_by: userId,
            updated_by: userId,
            is_deleted: false
        });
        
        // Add sub-module level permissions
        if (perm.sub_module_permissions && Array.isArray(perm.sub_module_permissions)) {
            perm.sub_module_permissions.forEach(subPerm => {
                flatPermissions.push({
                    role_id: roleId,
                    module_id: perm.module_id,
                    sub_module_id: subPerm.sub_module_id,
                    can_view: subPerm.permissions.can_view,
                    can_create: subPerm.permissions.can_create,
                    can_update: subPerm.permissions.can_update,
                    can_delete: subPerm.permissions.can_delete,
                    can_export: subPerm.permissions.can_export,
                    can_approve: subPerm.permissions.can_approve,
                    created_by: userId,
                    updated_by: userId,
                    is_deleted: false
                });
            });
        }
    });
    
    return flatPermissions;
};

// ==================== ROLE CONTROLLERS ====================

// 1. Create Role
const createRole = asynchandler(async (req, res) => {
    try {
        const { role_name, role_code, description } = req.body;
        const { RoleMaster } = req.tenantModels;

        if (!RoleMaster) {
            throw new ApiError(500, "RoleMaster model not found in tenant models");
        }

        if (!req.user || !req.user.id) {
            throw new ApiError(401, "User authentication required");
        }

        // Validate inputs
        const validatedName = validateRoleName(role_name);
        const validatedCode = validateRoleCode(role_code);

        // Check if role with same code exists (optimized query)
        const existingRole = await RoleMaster.findOne({
            where: {
                role_code: validatedCode,
                is_deleted: false
            },
            attributes: ['id', 'role_code'],  // Only fetch needed fields
            raw: true  // Return plain object for better performance
        });

        if (existingRole) {
            throw new ApiError(400, `Role with code '${validatedCode}' already exists`);
        }

        // Create role
        const role = await RoleMaster.create({
            role_name: validatedName,
            role_code: validatedCode,
            description: description?.trim() || null,
            is_system_role: false,
            is_active: true,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
    } catch (error) {
        console.error("Error creating role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while creating role: ${error.message}`);
    }
});

// 2. Get All Roles with Pagination
const getAllRoles = asynchandler(async (req, res) => {
    try {
        const { RoleMaster } = req.tenantModels;
        const { 
            page = 1, 
            limit = 10, 
            is_active, 
            is_system_role,
            search 
        } = req.query;

        const whereClause = {
            is_deleted: false
        };

        // Apply filters
        if (is_active !== undefined) {
            whereClause.is_active = is_active === 'true';
        }
        
        if (is_system_role !== undefined) {
            whereClause.is_system_role = is_system_role === 'true';
        }
        
        if (search?.trim()) {
            whereClause[Op.or] = [
                { role_name: { [Op.iLike]: `%${search.trim()}%` } },
                { role_code: { [Op.iLike]: `%${search.trim()}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        // Optimized query with raw SQL for count
        const { count, rows: roles } = await RoleMaster.findAndCountAll({
            where: whereClause,
            attributes: [
                'id', 
                'role_name', 
                'role_code', 
                'description', 
                'is_system_role', 
                'is_active',
                'createdAt',
                'updatedAt'
            ],
            order: [
                ['is_system_role', 'DESC'],  // System roles first
                ['createdAt', 'DESC']
            ],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json(new ApiResponse(200, {
            roles,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, "Roles retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving roles:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving roles: ${error.message}`);
    }
});

// 3. Get Role By ID with Permissions
const getRoleById = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { RoleMaster, RoleModulePermissions } = req.tenantModels;
        const Module = req.app.locals.models?.Module;
        const SubModule = req.app.locals.models?.Submodule || req.app.locals.models?.SubModule;

        validateUUID(id, "Role ID");

        // Optimized query with includes
        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            },
            attributes: [
                'id', 
                'role_name', 
                'role_code', 
                'description', 
                'is_system_role', 
                'is_active',
                'created_by',
                'createdAt',
                'updatedAt'
            ],
            include: [
                {
                    model: RoleModulePermissions,
                    as: 'permissions',
                    where: { is_deleted: false },
                    required: false,
                    attributes: [
                        'id',
                        'module_id',
                        'sub_module_id',
                        'can_view',
                        'can_create',
                        'can_update',
                        'can_delete',
                        'can_export',
                        'can_approve'
                    ]
                }
            ]
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        // Convert to plain object for easier manipulation
        const roleData = role.toJSON();

        // Fetch module and sub-module details from common schema (batch query)
        const permissions = roleData.permissions || [];
        
        if (permissions.length > 0 && Module) {
            const moduleIds = [...new Set(permissions.map(p => p.module_id))];
            const subModuleIds = [...new Set(permissions.filter(p => p.sub_module_id).map(p => p.sub_module_id))];

            // Batch fetch modules and sub-modules (optimized)
            const modulesPromise = Module.findAll({
                where: { id: { [Op.in]: moduleIds } },
                attributes: ['id', 'name', 'icon'],
                raw: true
            });

            const subModulesPromise = (subModuleIds.length > 0 && SubModule) ? SubModule.findAll({
                where: { id: { [Op.in]: subModuleIds } },
                attributes: ['id', 'name'],
                raw: true
            }) : Promise.resolve([]);

            const [modules, subModules] = await Promise.all([modulesPromise, subModulesPromise]);

            // Create lookup maps for O(1) access
            const moduleMap = new Map((modules || []).map(m => [m.id, m]));
            const subModuleMap = new Map((subModules || []).map(sm => [sm.id, sm]));

            // Group permissions hierarchically by module
            const groupedPermissions = {};
            
            permissions.forEach(perm => {
                const module = moduleMap.get(perm.module_id);
                
                if (!groupedPermissions[perm.module_id]) {
                    groupedPermissions[perm.module_id] = {
                        module_id: perm.module_id,
                        module_name: module?.name || 'Unknown Module',
                        module_icon: module?.icon || null,
                        module_permissions: null,
                        sub_modules: []
                    };
                }
                
                if (!perm.sub_module_id) {
                    // Module-level permission
                    groupedPermissions[perm.module_id].module_permissions = {
                        can_view: perm.can_view,
                        can_create: perm.can_create,
                        can_update: perm.can_update,
                        can_delete: perm.can_delete,
                        can_export: perm.can_export,
                        can_approve: perm.can_approve
                    };
                } else {
                    // Sub-module level permission
                    const subModule = subModuleMap.get(perm.sub_module_id);
                    groupedPermissions[perm.module_id].sub_modules.push({
                        sub_module_id: perm.sub_module_id,
                        sub_module_name: subModule?.name || 'Unknown Sub-module',
                        permissions: {
                            can_view: perm.can_view,
                            can_create: perm.can_create,
                            can_update: perm.can_update,
                            can_delete: perm.can_delete,
                            can_export: perm.can_export,
                            can_approve: perm.can_approve
                        }
                    });
                }
            });
            
            roleData.permissions = Object.values(groupedPermissions);
        }

        res.status(200).json(new ApiResponse(200, roleData, "Role retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving role: ${error.message}`);
    }
});

// 4. Update Role
const updateRole = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, description, is_active } = req.body;
        const { RoleMaster } = req.tenantModels;

        validateUUID(id, "Role ID");

        // Check if role exists
        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        // System roles name cannot be changed
        if (role.is_system_role && role_name && role_name !== role.role_name) {
            throw new ApiError(400, "Cannot modify name of system role");
        }

        // Build update object
        const updateData = {
            updated_by: req.user.id
        };

        if (role_name) {
            updateData.role_name = validateRoleName(role_name);
        }

        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }

        if (is_active !== undefined) {
            updateData.is_active = is_active;
        }

        // Update role
        await role.update(updateData);

        res.status(200).json(new ApiResponse(200, role, "Role updated successfully"));
    } catch (error) {
        console.error("Error updating role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating role: ${error.message}`);
    }
});

// 5. Assign/Update Permissions to Role
const assignPermissions = asynchandler(async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;
        const { RoleMaster, RoleModulePermissions } = req.tenantModels;

        validateUUID(roleId, "Role ID");
        const validatedPermissions = validatePermissions(permissions);

        // Check if role exists
        const role = await RoleMaster.findOne({
            where: {
                id: roleId,
                is_deleted: false
            },
            attributes: ['id', 'role_name', 'is_active']
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        const sequelize = RoleMaster.sequelize;
        const transaction = await sequelize.transaction();

        try {
            // Delete existing permissions (soft delete approach for audit)
            await RoleModulePermissions.update(
                {
                    is_deleted: true,
                    updated_by: req.user.id,
                    deleted_at: new Date()
                },
                {
                    where: {
                        role_id: roleId,
                        is_deleted: false
                    },
                    transaction
                }
            );

            // Flatten hierarchical permissions to database format
            const permissionsToCreate = flattenPermissions(validatedPermissions, roleId, req.user.id);

            // Bulk insert new permissions (optimized)
            await RoleModulePermissions.bulkCreate(permissionsToCreate, { transaction });

            await transaction.commit();

            res.status(200).json(new ApiResponse(200, {
                role_id: roleId,
                role_name: role.role_name,
                total_permissions_assigned: permissionsToCreate.length,
                modules_configured: validatedPermissions.length
            }, "Permissions assigned successfully"));
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error assigning permissions:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while assigning permissions: ${error.message}`);
    }
});

// 6. Soft Delete Role
const deleteRole = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { RoleMaster } = req.tenantModels;

        validateUUID(id, "Role ID");

        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        // Cannot delete system roles
        if (role.is_system_role) {
            throw new ApiError(400, "Cannot delete system role");
        }

        // TODO: Check if any staff is assigned to this role
        // Uncomment when Staff model is ready
        // const { Staff } = req.tenantModels;
        // const staffCount = await Staff.count({
        //     where: {
        //         role_id: id,
        //         is_deleted: false
        //     }
        // });
        
        // if (staffCount > 0) {
        //     throw new ApiError(400, `Cannot delete role. ${staffCount} staff member(s) are currently assigned to this role. Please reassign them first.`);
        // }

        // Soft delete
        await role.update({
            is_deleted: true,
            deleted_at: new Date(),
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, null, "Role deleted successfully"));
    } catch (error) {
        console.error("Error deleting role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting role: ${error.message}`);
    }
});

// 7. Restore Deleted Role
const restoreRole = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { RoleMaster } = req.tenantModels;

        validateUUID(id, "Role ID");

        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: true
            }
        });

        if (!role) {
            throw new ApiError(404, "Deleted role not found");
        }

        // Check if 90 days have passed
        const restorePeriodDays = parseInt(process.env.ROLE_RESTORE_PERIOD_DAYS) || 90;
        const daysSinceDeletion = Math.floor((new Date() - new Date(role.deleted_at)) / (1000 * 60 * 60 * 24));

        if (daysSinceDeletion > restorePeriodDays) {
            throw new ApiError(400, `Cannot restore role. ${restorePeriodDays} days have passed since deletion.`);
        }

        // Check if role_code conflict exists
        const existingRole = await RoleMaster.findOne({
            where: {
                role_code: role.role_code,
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingRole) {
            throw new ApiError(400, `Cannot restore role. Another role with code '${role.role_code}' already exists.`);
        }

        // Restore role
        await role.update({
            is_deleted: false,
            deleted_at: null,
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, role, "Role restored successfully"));
    } catch (error) {
        console.error("Error restoring role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while restoring role: ${error.message}`);
    }
});

// 8. Permanent Delete Role
const permanentDeleteRole = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { RoleMaster, RoleModulePermissions } = req.tenantModels;

        validateUUID(id, "Role ID");

        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        // Cannot permanently delete system roles
        if (role.is_system_role) {
            throw new ApiError(400, "Cannot permanently delete system role");
        }

        // TODO: Check if any staff is assigned
        // Uncomment when Staff model is ready
        // const { Staff } = req.tenantModels;
        // const staffCount = await Staff.count({
        //     where: {
        //         role_id: id,
        //         is_deleted: false
        //     }
        // });
        
        // if (staffCount > 0) {
        //     throw new ApiError(400, `Cannot permanently delete role. ${staffCount} staff member(s) are currently assigned to this role.`);
        // }

        const sequelize = RoleMaster.sequelize;
        const transaction = await sequelize.transaction();

        try {
            // Permanently delete all permissions
            await RoleModulePermissions.destroy({
                where: {
                    role_id: id
                },
                transaction,
                force: true  // Hard delete
            });

            // Permanently delete role
            await RoleMaster.destroy({
                where: {
                    id: id
                },
                transaction,
                force: true  // Hard delete
            });

            await transaction.commit();

            res.status(200).json(new ApiResponse(200, null, "Role permanently deleted successfully"));
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error permanently deleting role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while permanently deleting role: ${error.message}`);
    }
});

// 9. Toggle Role Status (Activate/Deactivate)
const toggleRoleStatus = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const { RoleMaster } = req.tenantModels;

        validateUUID(id, "Role ID");

        if (typeof is_active !== 'boolean') {
            throw new ApiError(400, "is_active must be a boolean value");
        }

        const role = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!role) {
            throw new ApiError(404, "Role not found");
        }

        await role.update({
            is_active: is_active,
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, role, `Role ${is_active ? 'activated' : 'deactivated'} successfully`));
    } catch (error) {
        console.error("Error toggling role status:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while toggling role status: ${error.message}`);
    }
});

// 10. Clone Role
const cloneRole = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { new_role_name, new_role_code, description, copy_permissions = true } = req.body;
        const { RoleMaster, RoleModulePermissions } = req.tenantModels;

        validateUUID(id, "Role ID");

        // Validate new role details
        const validatedName = validateRoleName(new_role_name);
        const validatedCode = validateRoleCode(new_role_code);

        // Check if source role exists
        const sourceRole = await RoleMaster.findOne({
            where: {
                id: id,
                is_deleted: false
            },
            include: copy_permissions ? [
                {
                    model: RoleModulePermissions,
                    as: 'permissions',
                    where: { is_deleted: false },
                    required: false
                }
            ] : []
        });

        if (!sourceRole) {
            throw new ApiError(404, "Source role not found");
        }

        // Check if new role code already exists
        const existingRole = await RoleMaster.findOne({
            where: {
                role_code: validatedCode,
                is_deleted: false
            }
        });

        if (existingRole) {
            throw new ApiError(400, `Role with code '${validatedCode}' already exists`);
        }

        const sequelize = RoleMaster.sequelize;
        const transaction = await sequelize.transaction();

        try {
            // Create new role
            const newRole = await RoleMaster.create({
                role_name: validatedName,
                role_code: validatedCode,
                description: description?.trim() || `Cloned from ${sourceRole.role_name}`,
                is_system_role: false,
                is_active: true,
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction });

            let permissionsCopied = 0;

            // Copy permissions if requested
            if (copy_permissions && sourceRole.permissions && sourceRole.permissions.length > 0) {
                const permissionsToCreate = sourceRole.permissions.map(perm => ({
                    role_id: newRole.id,
                    module_id: perm.module_id,
                    sub_module_id: perm.sub_module_id,
                    can_view: perm.can_view,
                    can_create: perm.can_create,
                    can_update: perm.can_update,
                    can_delete: perm.can_delete,
                    can_export: perm.can_export,
                    can_approve: perm.can_approve,
                    created_by: req.user.id,
                    updated_by: req.user.id
                }));

                await RoleModulePermissions.bulkCreate(permissionsToCreate, { transaction });
                permissionsCopied = permissionsToCreate.length;
            }

            await transaction.commit();

            res.status(201).json(new ApiResponse(201, {
                id: newRole.id,
                role_name: newRole.role_name,
                role_code: newRole.role_code,
                description: newRole.description,
                is_system_role: newRole.is_system_role,
                is_active: newRole.is_active,
                cloned_from: {
                    id: sourceRole.id,
                    role_name: sourceRole.role_name
                },
                permissions_copied: permissionsCopied
            }, `Role cloned successfully${copy_permissions ? ` with ${permissionsCopied} permission(s)` : ''}`));
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error cloning role:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while cloning role: ${error.message}`);
    }
});

// 11. Get Available Modules for Permission Assignment
const getAvailableModules = asynchandler(async (req, res) => {
    try {
        const Module = req.app.locals.models?.Module;
        const SubModule = req.app.locals.models?.Submodule || req.app.locals.models?.SubModule;
        const SchoolModule = req.app.locals.models?.Schoolmodule || req.app.locals.models?.SchoolModule;
        
        if (!Module) {
            throw new ApiError(500, "Module model not found");
        }

        const schoolId = req.user.schoolId;  // Assuming user has schoolId

        if (!schoolId) {
            throw new ApiError(400, "School ID not found in user context");
        }

        if (!SchoolModule) {
            // If SchoolModule doesn't exist, return all modules
            const modules = await Module.findAll({
                attributes: ['id', 'name', 'icon'],
                order: [['name', 'ASC']],
                raw: true
            });

            const moduleMap = new Map();
            modules.forEach(module => {
                moduleMap.set(module.id, {
                    module_id: module.id,
                    module_name: module.name,
                    module_icon: module.icon || 'box',
                    is_subscribed: true,
                    sub_modules: []
                });
            });

            if (SubModule) {
                const subModules = await SubModule.findAll({
                    attributes: ['id', 'name', 'moduleId'],
                    order: [['name', 'ASC']],
                    raw: true
                });

                subModules.forEach(subModule => {
                    const module = moduleMap.get(subModule.moduleId);
                    if (module) {
                        module.sub_modules.push({
                            sub_module_id: subModule.id,
                            sub_module_name: subModule.name
                        });
                    }
                });
            }

            const modulesArray = Array.from(moduleMap.values());
            return res.status(200).json(new ApiResponse(200, {
                modules: modulesArray
            }, "Available modules retrieved successfully"));
        }

        // Get subscribed modules for this school
        const schoolModules = await SchoolModule.findAll({
            where: {
                schoolId: schoolId,
                isActive: true
            },
            attributes: ['moduleId'],
            raw: true
        });

        const subscribedModuleIds = schoolModules.map(sm => sm.moduleId);

        if (subscribedModuleIds.length === 0) {
            return res.status(200).json(new ApiResponse(200, { modules: [] }, "No modules subscribed"));
        }

        // Fetch modules and sub-modules (optimized with parallel queries)
        const modulesPromise = Module.findAll({
            where: {
                id: { [Op.in]: subscribedModuleIds }
            },
            attributes: ['id', 'name', 'icon'],
            order: [['name', 'ASC']],
            raw: true
        });

        const subModulesPromise = SubModule ? SubModule.findAll({
            where: {
                moduleId: { [Op.in]: subscribedModuleIds }
            },
            attributes: ['id', 'name', 'moduleId'],
            order: [['name', 'ASC']],
            raw: true
        }) : Promise.resolve([]);

        const [modules, subModules] = await Promise.all([modulesPromise, subModulesPromise]);

        // Group sub-modules by module
        const moduleMap = new Map();
        (modules || []).forEach(module => {
            moduleMap.set(module.id, {
                module_id: module.id,
                module_name: module.name,
                module_icon: module.icon || 'box',
                is_subscribed: true,
                sub_modules: []
            });
        });

        (subModules || []).forEach(subModule => {
            const module = moduleMap.get(subModule.moduleId);
            if (module) {
                module.sub_modules.push({
                    sub_module_id: subModule.id,
                    sub_module_name: subModule.name
                });
            }
        });

        const modulesArray = Array.from(moduleMap.values());

        res.status(200).json(new ApiResponse(200, {
            modules: modulesArray
        }, "Available modules retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving available modules:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving available modules: ${error.message}`);
    }
});

export {
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
};

