import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== DEPARTMENT MASTER CONTROLLERS ====================

const createDepartmentMaster = asynchandler(async (req, res) => {
    const {
        name,
        description,
        status = true
    } = req.body;
    const { Department } = req.tenantModels;

    if (!name) {
        throw new ApiError(400, "Department name is required");
    }

    // Check if department with same name exists
    const existingDepartment = await Department.findOne({
        where: {
            name: name.toLowerCase(),
            is_deleted: false
        }
    });

    if (existingDepartment) {
        throw new ApiError(400, "Department with this name already exists");
    }

    const department = await Department.create({
        name: name.toLowerCase(),
        description,
        status,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, department, `Department '${name}' created successfully by ${req.user.email}`)
    );
});

const getAllDepartmentMasters = asynchandler(async (req, res) => {
    const { Department } = req.tenantModels;
    const { include_deleted = false, status } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (status !== undefined) {
        whereCondition.status = status === 'true';
    }

    const departments = await Department.findAll({
        where: whereCondition,
        order: [['name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, departments, "Department masters fetched successfully")
    );
});

const getDepartmentMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { Department } = req.tenantModels;

    const department = await Department.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!department) {
        throw new ApiError(404, "Department master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, department, "Department master fetched successfully")
    );
});

const updateDepartmentMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { Department } = req.tenantModels;
    const updates = req.body;

    const department = await Department.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!department) {
        throw new ApiError(404, "Department master not found");
    }

    // Check for name conflicts
    if (updates.name) {
        const existingDepartment = await Department.findOne({
            where: {
                name: updates.name.toLowerCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingDepartment) {
            throw new ApiError(400, "Department with this name already exists");
        }
        updates.name = updates.name.toLowerCase();
    }

    updates.updated_by = req.user.id;

    const changes = {};
    Object.keys(updates).forEach(key => {
        if (updates[key] !== department[key]) {
            changes[key] = {
                from: department[key],
                to: updates[key]
            };
        }
    });

    await department.update(updates);

    return res.status(200).json(
        new ApiResponse(200, {
            ...department.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Department master updated successfully by ${req.user.email}`)
    );
});

const deleteDepartmentMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { Department, LeavePolicy } = req.tenantModels;

    const department = await Department.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!department) {
        throw new ApiError(404, "Department master not found");
    }

    // Check if department is being used in any leave policies
    const leavePolicyCount = await LeavePolicy.count({
        where: {
            department_id: id,
            is_deleted: false
        }
    });

    if (leavePolicyCount > 0) {
        throw new ApiError(400, `Cannot delete department '${department.name}' as it is being used by ${leavePolicyCount} leave policy(ies). Please remove all leave policy associations first.`);
    }

    await department.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: department.id,
            name: department.name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Department master '${department.name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreDepartmentMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { Department } = req.tenantModels;

    const department = await Department.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!department) {
        throw new ApiError(404, "Deleted department master not found");
    }

    await department.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: department.id,
            name: department.name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Department master '${department.name}' restored successfully by ${req.user.email}`)
    );
});

// ==================== LEAVE TYPE MASTER CONTROLLERS ====================

const createLeaveTypeMaster = asynchandler(async (req, res) => {
    const {
        name,
        description,
        max_days,
        status = true
    } = req.body;
    const { LeaveType } = req.tenantModels;

    if (!name) {
        throw new ApiError(400, "Leave type name is required");
    }

    if (!max_days) {
        throw new ApiError(400, "Maximum days is required");
    }

    // Check if leave type with same name exists
    const existingLeaveType = await LeaveType.findOne({
        where: {
            name: name.toLowerCase(),
            is_deleted: false
        }
    });

    if (existingLeaveType) {
        throw new ApiError(400, "Leave type with this name already exists");
    }

    const leaveType = await LeaveType.create({
        name: name.toLowerCase(),
        description,
        max_days,
        status,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, leaveType, `Leave type '${name}' created successfully by ${req.user.email}`)
    );
});

const getAllLeaveTypeMasters = asynchandler(async (req, res) => {
    const { LeaveType } = req.tenantModels;
    const { include_deleted = false, status } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (status !== undefined) {
        whereCondition.status = status === 'true';
    }

    const leaveTypes = await LeaveType.findAll({
        where: whereCondition,
        order: [['name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, leaveTypes, "Leave type masters fetched successfully")
    );
});

const getLeaveTypeMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeaveType } = req.tenantModels;

    const leaveType = await LeaveType.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!leaveType) {
        throw new ApiError(404, "Leave type master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, leaveType, "Leave type master fetched successfully")
    );
});

const updateLeaveTypeMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeaveType } = req.tenantModels;
    const updates = req.body;

    const leaveType = await LeaveType.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!leaveType) {
        throw new ApiError(404, "Leave type master not found");
    }

    // Check for name conflicts
    if (updates.name) {
        const existingLeaveType = await LeaveType.findOne({
            where: {
                name: updates.name.toLowerCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingLeaveType) {
            throw new ApiError(400, "Leave type with this name already exists");
        }
        updates.name = updates.name.toLowerCase();
    }

    updates.updated_by = req.user.id;

    const changes = {};
    Object.keys(updates).forEach(key => {
        if (updates[key] !== leaveType[key]) {
            changes[key] = {
                from: leaveType[key],
                to: updates[key]
            };
        }
    });

    await leaveType.update(updates);

    return res.status(200).json(
        new ApiResponse(200, {
            ...leaveType.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Leave type master updated successfully by ${req.user.email}`)
    );
});

const deleteLeaveTypeMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeaveType, LeavePolicy } = req.tenantModels;

    const leaveType = await LeaveType.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!leaveType) {
        throw new ApiError(404, "Leave type master not found");
    }

    // Check if leave type is being used in any leave policies
    const leavePolicyCount = await LeavePolicy.count({
        where: {
            leave_type_id: id,
            is_deleted: false
        }
    });

    if (leavePolicyCount > 0) {
        throw new ApiError(400, `Cannot delete leave type '${leaveType.name}' as it is being used by ${leavePolicyCount} leave policy(ies). Please remove all leave policy associations first.`);
    }

    await leaveType.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: leaveType.id,
            name: leaveType.name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Leave type master '${leaveType.name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreLeaveTypeMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeaveType } = req.tenantModels;

    const leaveType = await LeaveType.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!leaveType) {
        throw new ApiError(404, "Deleted leave type master not found");
    }

    await leaveType.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: leaveType.id,
            name: leaveType.name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Leave type master '${leaveType.name}' restored successfully by ${req.user.email}`)
    );
});

// ==================== LEAVE POLICY MASTER CONTROLLERS ====================

const createLeavePolicyMaster = asynchandler(async (req, res) => {
    const {
        name,
        description,
        leave_type_id,
        department_ids = [], // Array of department IDs
        max_days_per_year,
        auto_approve = false,
        approval_required = true,
        status = true
    } = req.body;
    const { LeavePolicy, LeaveType, Department, LeavePolicyDepartment } = req.tenantModels;

    if (!name) {
        throw new ApiError(400, "Leave policy name is required");
    }

    if (!leave_type_id) {
        throw new ApiError(400, "Leave type is required");
    }

    if (!max_days_per_year) {
        throw new ApiError(400, "Maximum days per year is required");
    }

    // Check if policy with same name exists
    const existingPolicy = await LeavePolicy.findOne({
        where: {
            name: name.toLowerCase(),
            is_deleted: false
        }
    });

    if (existingPolicy) {
        throw new ApiError(400, "Leave policy with this name already exists");
    }

    // Validate leave type exists
    const leaveType = await LeaveType.findOne({
        where: {
            id: leave_type_id,
            is_deleted: false
        }
    });

    if (!leaveType) {
        throw new ApiError(400, "Invalid leave type selected");
    }

    // Validate departments exist (if provided)
    if (department_ids && department_ids.length > 0) {
        const departments = await Department.findAll({
            where: {
                id: department_ids,
                is_deleted: false
            }
        });

        if (departments.length !== department_ids.length) {
            throw new ApiError(400, "One or more departments are invalid or not found");
        }
    }

    // Create the leave policy
    const leavePolicy = await LeavePolicy.create({
        name: name.toLowerCase(),
        description,
        leave_type_id,
        max_days_per_year,
        auto_approve,
        approval_required,
        status,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    // Create department associations if departments are provided
    if (department_ids && department_ids.length > 0) {
        const departmentAssociations = department_ids.map(deptId => ({
            leave_policy_id: leavePolicy.id,
            department_id: deptId,
            created_by: req.user.id,
            updated_by: req.user.id
        }));

        await LeavePolicyDepartment.bulkCreate(departmentAssociations);
    }

    // Fetch the created policy with departments
    const createdPolicy = await LeavePolicy.findByPk(leavePolicy.id, {
        include: [
            {
                model: LeaveType,
                as: 'leaveType',
                attributes: ['id', 'name', 'description']
            },
            {
                model: Department,
                as: 'departments',
                attributes: ['id', 'name', 'description'],
                through: { attributes: [] }
            }
        ]
    });

    return res.status(201).json(
        new ApiResponse(201, createdPolicy, `Leave policy '${name}' created successfully by ${req.user.email}`)
    );
});

const getAllLeavePolicyMasters = asynchandler(async (req, res) => {
    const { LeavePolicy, LeaveType, Department } = req.tenantModels;
    const { include_deleted = false, status } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (status !== undefined) {
        whereCondition.status = status === 'true';
    }

    const leavePolicies = await LeavePolicy.findAll({
        where: whereCondition,
        include: [
            {
                model: LeaveType,
                as: 'leaveType',
                attributes: ['id', 'name', 'description']
            },
            {
                model: Department,
                as: 'departments',
                attributes: ['id', 'name', 'description'],
                through: { attributes: [] }
            }
        ],
        order: [['name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, leavePolicies, "Leave policy masters fetched successfully")
    );
});

const getLeavePolicyMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeavePolicy, LeaveType, Department } = req.tenantModels;

    const leavePolicy = await LeavePolicy.findOne({
        where: {
            id,
            is_deleted: false
        },
        include: [
            {
                model: LeaveType,
                as: 'leaveType',
                attributes: ['id', 'name', 'description']
            },
            {
                model: Department,
                as: 'departments',
                attributes: ['id', 'name', 'description'],
                through: { attributes: [] }
            }
        ]
    });

    if (!leavePolicy) {
        throw new ApiError(404, "Leave policy master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, leavePolicy, "Leave policy master fetched successfully")
    );
});

const updateLeavePolicyMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeavePolicy, LeaveType, Department, LeavePolicyDepartment } = req.tenantModels;
    const updates = req.body;
    const { department_ids, ...policyUpdates } = updates;

    const leavePolicy = await LeavePolicy.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!leavePolicy) {
        throw new ApiError(404, "Leave policy master not found");
    }

    // Check for name conflicts
    if (policyUpdates.name) {
        const existingPolicy = await LeavePolicy.findOne({
            where: {
                name: policyUpdates.name.toLowerCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingPolicy) {
            throw new ApiError(400, "Leave policy with this name already exists");
        }
        policyUpdates.name = policyUpdates.name.toLowerCase();
    }

    // Validate leave type exists (if provided)
    if (policyUpdates.leave_type_id) {
        const leaveType = await LeaveType.findOne({
            where: {
                id: policyUpdates.leave_type_id,
                is_deleted: false
            }
        });

        if (!leaveType) {
            throw new ApiError(400, "Invalid leave type selected");
        }
    }

    // Validate departments exist (if provided)
    if (department_ids && department_ids.length > 0) {
        const departments = await Department.findAll({
            where: {
                id: department_ids,
                is_deleted: false
            }
        });

        if (departments.length !== department_ids.length) {
            throw new ApiError(400, "One or more departments are invalid or not found");
        }
    }

    policyUpdates.updated_by = req.user.id;

    const changes = {};
    Object.keys(policyUpdates).forEach(key => {
        if (policyUpdates[key] !== leavePolicy[key]) {
            changes[key] = {
                from: leavePolicy[key],
                to: policyUpdates[key]
            };
        }
    });

    // Update the leave policy
    await leavePolicy.update(policyUpdates);

    // Update department associations if department_ids is provided
    if (department_ids !== undefined) {
        // Remove existing department associations
        await LeavePolicyDepartment.update(
            { 
                is_deleted: true, 
                deleted_at: new Date(),
                updated_by: req.user.id 
            },
            {
                where: {
                    leave_policy_id: id,
                    is_deleted: false
                }
            }
        );

        // Create new department associations if departments are provided
        if (department_ids && department_ids.length > 0) {
            const departmentAssociations = department_ids.map(deptId => ({
                leave_policy_id: id,
                department_id: deptId,
                created_by: req.user.id,
                updated_by: req.user.id
            }));

            await LeavePolicyDepartment.bulkCreate(departmentAssociations);
        }
    }

    // Fetch the updated policy with departments
    const updatedPolicy = await LeavePolicy.findByPk(id, {
        include: [
            {
                model: LeaveType,
                as: 'leaveType',
                attributes: ['id', 'name', 'description']
            },
            {
                model: Department,
                as: 'departments',
                attributes: ['id', 'name', 'description'],
                through: { attributes: [] }
            }
        ]
    });

    return res.status(200).json(
        new ApiResponse(200, {
            ...updatedPolicy.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Leave policy master updated successfully by ${req.user.email}`)
    );
});

const deleteLeavePolicyMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeavePolicy } = req.tenantModels;

    const leavePolicy = await LeavePolicy.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!leavePolicy) {
        throw new ApiError(404, "Leave policy master not found");
    }

    // Note: Leave policies can be deleted as they are not referenced by other tables
    // If in future they are referenced, add validation here

    await leavePolicy.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: leavePolicy.id,
            name: leavePolicy.name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Leave policy master '${leavePolicy.name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreLeavePolicyMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { LeavePolicy } = req.tenantModels;

    const leavePolicy = await LeavePolicy.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!leavePolicy) {
        throw new ApiError(404, "Deleted leave policy master not found");
    }

    await leavePolicy.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: leavePolicy.id,
            name: leavePolicy.name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Leave policy master '${leavePolicy.name}' restored successfully by ${req.user.email}`)
    );
});

export {
    // Department Master
    createDepartmentMaster,
    getAllDepartmentMasters,
    getDepartmentMasterById,
    updateDepartmentMaster,
    deleteDepartmentMaster,
    restoreDepartmentMaster,
    // Leave Type Master
    createLeaveTypeMaster,
    getAllLeaveTypeMasters,
    getLeaveTypeMasterById,
    updateLeaveTypeMaster,
    deleteLeaveTypeMaster,
    restoreLeaveTypeMaster,
    // Leave Policy Master
    createLeavePolicyMaster,
    getAllLeavePolicyMasters,
    getLeavePolicyMasterById,
    updateLeavePolicyMaster,
    deleteLeavePolicyMaster,
    restoreLeavePolicyMaster
};
