import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== STAFF SETTINGS OVERVIEW ====================

const getSettingsOverview = asynchandler(async (req, res) => {
    const { Department, LeaveType, LeavePolicy } = req.tenantModels;

    // Get department statistics
    const departmentCount = await Department.count({
        where: { is_deleted: false }
    });

    const activeDepartmentCount = await Department.count({
        where: { is_deleted: false, status: true }
    });

    const inactiveDepartmentCount = await Department.count({
        where: { is_deleted: false, status: false }
    });

    // Get leave type statistics
    const leaveTypeCount = await LeaveType.count({
        where: { is_deleted: false }
    });

    const activeLeaveTypeCount = await LeaveType.count({
        where: { is_deleted: false, status: true }
    });

    const inactiveLeaveTypeCount = await LeaveType.count({
        where: { is_deleted: false, status: false }
    });

    // Get leave policy statistics
    const leavePolicyCount = await LeavePolicy.count({
        where: { is_deleted: false }
    });

    const autoApproveCount = await LeavePolicy.count({
        where: { is_deleted: false, auto_approve: true }
    });

    const manualApproveCount = await LeavePolicy.count({
        where: { is_deleted: false, auto_approve: false }
    });

    // Get recent changes
    const recentDepartments = await Department.findAll({
        where: { is_deleted: false },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'updated_by', 'updatedAt']
    });

    const recentLeaveTypes = await LeaveType.findAll({
        where: { is_deleted: false },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'updated_by', 'updatedAt']
    });

    const recentLeavePolicies = await LeavePolicy.findAll({
        where: { is_deleted: false },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'updated_by', 'updatedAt']
    });

    const overview = {
        departments: { 
            total: departmentCount, 
            active: activeDepartmentCount, 
            inactive: inactiveDepartmentCount 
        },
        leave_types: { 
            total: leaveTypeCount, 
            active: activeLeaveTypeCount, 
            inactive: inactiveLeaveTypeCount 
        },
        leave_policies: { 
            total: leavePolicyCount, 
            auto_approve: autoApproveCount, 
            manual_approve: manualApproveCount 
        },
        recent_changes: [
            ...recentDepartments.map(d => ({ type: 'department', action: 'updated', name: d.name, changed_by: d.updated_by, changed_at: d.updatedAt })),
            ...recentLeaveTypes.map(lt => ({ type: 'leave_type', action: 'updated', name: lt.name, changed_by: lt.updated_by, changed_at: lt.updatedAt })),
            ...recentLeavePolicies.map(lp => ({ type: 'leave_policy', action: 'updated', name: lp.name, changed_by: lp.updated_by, changed_at: lp.updatedAt }))
        ].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at)).slice(0, 10)
    };

    return res.status(200).json(
        new ApiResponse(200, overview, "Settings overview fetched successfully")
    );
});

export {
    // Overview
    getSettingsOverview
};

