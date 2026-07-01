import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== CLASS MASTER CONTROLLERS ====================

const createClassMaster = asynchandler(async (req, res) => {
    const {
        class_name,
        class_code,
        display_order = 0,
        description,
        is_active = true
    } = req.body;
    const { ClassMaster } = req.tenantModels;

    if (!class_name) {
        throw new ApiError(400, "Class name is required");
    }

    // Check if class with same name exists
    const existingClass = await ClassMaster.findOne({
        where: {
            class_name: class_name.toLowerCase(),
            is_deleted: false
        }
    });

    if (existingClass) {
        throw new ApiError(400, "Class with this name already exists");
    }

    // Check if class code exists (if provided)
    if (class_code) {
        const existingCode = await ClassMaster.findOne({
            where: {
                class_code: class_code.toUpperCase(),
                is_deleted: false
            }
        });

        if (existingCode) {
            throw new ApiError(400, "Class with this code already exists");
        }
    }

    const classMaster = await ClassMaster.create({
        class_name: class_name.toLowerCase(),
        class_code: class_code ? class_code.toUpperCase() : null,
        display_order,
        description,
        is_active,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, classMaster, `Class '${class_name}' created successfully by ${req.user.email}`)
    );
});

const getAllClassMasters = asynchandler(async (req, res) => {
    const { ClassMaster } = req.tenantModels;
    const { include_deleted = false, is_active } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (is_active !== undefined) {
        whereCondition.is_active = is_active === 'true';
    }

    const classMasters = await ClassMaster.findAll({
        where: whereCondition,
        order: [['display_order', 'ASC'], ['class_name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, classMasters, "Class masters fetched successfully")
    );
});

const getClassMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { ClassMaster } = req.tenantModels;

    const classMaster = await ClassMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!classMaster) {
        throw new ApiError(404, "Class master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, classMaster, "Class master fetched successfully")
    );
});

const updateClassMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { ClassMaster } = req.tenantModels;
    const updates = req.body;

    const classMaster = await ClassMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!classMaster) {
        throw new ApiError(404, "Class master not found");
    }

    // Check for name conflicts
    if (updates.class_name) {
        const existingClass = await ClassMaster.findOne({
            where: {
                class_name: updates.class_name.toLowerCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingClass) {
            throw new ApiError(400, "Class with this name already exists");
        }
        updates.class_name = updates.class_name.toLowerCase();
    }

    // Check for code conflicts
    if (updates.class_code) {
        const existingCode = await ClassMaster.findOne({
            where: {
                class_code: updates.class_code.toUpperCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingCode) {
            throw new ApiError(400, "Class with this code already exists");
        }
        updates.class_code = updates.class_code.toUpperCase();
    }

    updates.updated_by = req.user.id;

    const changes = {};
    Object.keys(updates).forEach(key => {
        if (updates[key] !== classMaster[key]) {
            changes[key] = {
                from: classMaster[key],
                to: updates[key]
            };
        }
    });

    await classMaster.update(updates);

    return res.status(200).json(
        new ApiResponse(200, {
            ...classMaster.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Class master updated successfully by ${req.user.email}`)
    );
});

const deleteClassMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { ClassMaster } = req.tenantModels;

    const classMaster = await ClassMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!classMaster) {
        throw new ApiError(404, "Class master not found");
    }

    // TODO: Add usage checks when student-class and academic year-class relationships are implemented

    await classMaster.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: classMaster.id,
            class_name: classMaster.class_name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Class master '${classMaster.class_name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreClassMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { ClassMaster } = req.tenantModels;

    const classMaster = await ClassMaster.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!classMaster) {
        throw new ApiError(404, "Deleted class master not found");
    }

    await classMaster.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: classMaster.id,
            class_name: classMaster.class_name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Class master '${classMaster.class_name}' restored successfully by ${req.user.email}`)
    );
});

// ==================== SECTION MASTER CONTROLLERS ====================

const createSectionMaster = asynchandler(async (req, res) => {
    const {
        section_name,
        section_code,
        display_order = 0,
        description,
        is_active = true
    } = req.body;
    const { SectionMaster } = req.tenantModels;

    if (!section_name) {
        throw new ApiError(400, "Section name is required");
    }

    // Check if section with same name exists
    const existingSection = await SectionMaster.findOne({
        where: {
            section_name: section_name.toLowerCase(),
            is_deleted: false
        }
    });

    if (existingSection) {
        throw new ApiError(400, "Section with this name already exists");
    }

    // Check if section code exists (if provided)
    if (section_code) {
        const existingCode = await SectionMaster.findOne({
            where: {
                section_code: section_code.toUpperCase(),
                is_deleted: false
            }
        });

        if (existingCode) {
            throw new ApiError(400, "Section with this code already exists");
        }
    }

    const sectionMaster = await SectionMaster.create({
        section_name: section_name.toLowerCase(),
        section_code: section_code ? section_code.toUpperCase() : null,
        display_order,
        description,
        is_active,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, sectionMaster, `Section '${section_name}' created successfully by ${req.user.email}`)
    );
});

const getAllSectionMasters = asynchandler(async (req, res) => {
    const { SectionMaster } = req.tenantModels;
    const { include_deleted = false, is_active } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (is_active !== undefined) {
        whereCondition.is_active = is_active === 'true';
    }

    const sectionMasters = await SectionMaster.findAll({
        where: whereCondition,
        order: [['display_order', 'ASC'], ['section_name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, sectionMasters, "Section masters fetched successfully")
    );
});

const getSectionMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SectionMaster } = req.tenantModels;

    const sectionMaster = await SectionMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!sectionMaster) {
        throw new ApiError(404, "Section master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, sectionMaster, "Section master fetched successfully")
    );
});

const updateSectionMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SectionMaster } = req.tenantModels;
    const updates = req.body;

    const sectionMaster = await SectionMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!sectionMaster) {
        throw new ApiError(404, "Section master not found");
    }

    // Check for name conflicts
    if (updates.section_name) {
        const existingSection = await SectionMaster.findOne({
            where: {
                section_name: updates.section_name.toLowerCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingSection) {
            throw new ApiError(400, "Section with this name already exists");
        }
        updates.section_name = updates.section_name.toLowerCase();
    }

    // Check for code conflicts
    if (updates.section_code) {
        const existingCode = await SectionMaster.findOne({
            where: {
                section_code: updates.section_code.toUpperCase(),
                is_deleted: false,
                id: { [Op.ne]: id }
            }
        });

        if (existingCode) {
            throw new ApiError(400, "Section with this code already exists");
        }
        updates.section_code = updates.section_code.toUpperCase();
    }

    updates.updated_by = req.user.id;

    const changes = {};
    Object.keys(updates).forEach(key => {
        if (updates[key] !== sectionMaster[key]) {
            changes[key] = {
                from: sectionMaster[key],
                to: updates[key]
            };
        }
    });

    await sectionMaster.update(updates);

    return res.status(200).json(
        new ApiResponse(200, {
            ...sectionMaster.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Section master updated successfully by ${req.user.email}`)
    );
});

const deleteSectionMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SectionMaster } = req.tenantModels;

    const sectionMaster = await SectionMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!sectionMaster) {
        throw new ApiError(404, "Section master not found");
    }

    // TODO: Add usage checks when student-section and academic year-section relationships are implemented

    await sectionMaster.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: sectionMaster.id,
            section_name: sectionMaster.section_name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Section master '${sectionMaster.section_name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreSectionMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SectionMaster } = req.tenantModels;

    const sectionMaster = await SectionMaster.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!sectionMaster) {
        throw new ApiError(404, "Deleted section master not found");
    }

    await sectionMaster.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: sectionMaster.id,
            section_name: sectionMaster.section_name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Section master '${sectionMaster.section_name}' restored successfully by ${req.user.email}`)
    );
});

export {
    // Class Master
    createClassMaster,
    getAllClassMasters,
    getClassMasterById,
    updateClassMaster,
    deleteClassMaster,
    restoreClassMaster,
    // Section Master
    createSectionMaster,
    getAllSectionMasters,
    getSectionMasterById,
    updateSectionMaster,
    deleteSectionMaster,
    restoreSectionMaster
};
