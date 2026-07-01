import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== CLASS MASTER CONTROLLERS ====================

const createClassMaster = asynchandler(async (req, res) => {
    const { 
        class_name, 
        class_code, 
        display_order,
        description,
        is_active = true 
    } = req.body;
    const { ClassMaster } = req.tenantModels;

    // Validate required fields
    if (!class_name) {
        throw new ApiError(400, "Class name is required");
    }

    // Check if class with same name or code exists
    const whereCondition = {
        is_deleted: false
    };
    
    if (class_code) {
        whereCondition[Op.or] = [
            { class_name: class_name.toLowerCase() },
            { class_code: class_code.toUpperCase() }
        ];
    } else {
        whereCondition.class_name = class_name.toLowerCase();
    }

    const existingClass = await ClassMaster.findOne({
        where: whereCondition
    });

    if (existingClass) {
        throw new ApiError(400, "Class with this name or code already exists");
    }

    const classMaster = await ClassMaster.create({
        class_name: class_name.toLowerCase(),
        class_code: class_code ? class_code.toUpperCase() : null,
        display_order: display_order || 0,
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
    const { 
        class_name, 
        class_code, 
        display_order,
        description, 
        is_active 
    } = req.body;
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

    // Check if new name or code already exists (excluding current class)
    if (class_name || class_code) {
        const whereCondition = {
            id: { [Op.ne]: id },
            is_deleted: false
        };
        
        if (class_name && class_code) {
            whereCondition[Op.or] = [
                { class_name: class_name.toLowerCase() },
                { class_code: class_code.toUpperCase() }
            ];
        } else if (class_name) {
            whereCondition.class_name = class_name.toLowerCase();
        } else if (class_code) {
            whereCondition.class_code = class_code.toUpperCase();
        }

        const existingClass = await ClassMaster.findOne({
            where: whereCondition
        });

        if (existingClass) {
            throw new ApiError(400, "Class with this name or code already exists");
        }
    }

    const oldValues = {
        class_name: classMaster.class_name,
        class_code: classMaster.class_code,
        display_order: classMaster.display_order,
        description: classMaster.description,
        is_active: classMaster.is_active
    };

    await classMaster.update({
        class_name: class_name ? class_name.toLowerCase() : classMaster.class_name,
        class_code: class_code !== undefined ? (class_code ? class_code.toUpperCase() : null) : classMaster.class_code,
        display_order: display_order !== undefined ? display_order : classMaster.display_order,
        description: description !== undefined ? description : classMaster.description,
        is_active: is_active !== undefined ? is_active : classMaster.is_active,
        updated_by: req.user.id
    });

    const changes = {};
    if (class_name && class_name.toLowerCase() !== oldValues.class_name) {
        changes.class_name = { from: oldValues.class_name, to: class_name.toLowerCase() };
    }
    if (class_code !== oldValues.class_code) {
        changes.class_code = { from: oldValues.class_code, to: class_code ? class_code.toUpperCase() : null };
    }
    if (display_order !== oldValues.display_order) {
        changes.display_order = { from: oldValues.display_order, to: display_order };
    }
    if (description !== oldValues.description) {
        changes.description = { from: oldValues.description, to: description };
    }
    if (is_active !== oldValues.is_active) {
        changes.is_active = { from: oldValues.is_active, to: is_active };
    }

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
        display_order,
        description,
        is_active = true 
    } = req.body;
    const { SectionMaster } = req.tenantModels;

    // Validate required fields
    if (!section_name) {
        throw new ApiError(400, "Section name is required");
    }

    // Check if section with same name or code exists
    const whereCondition = {
        is_deleted: false
    };
    
    if (section_code) {
        whereCondition[Op.or] = [
            { section_name: section_name.toLowerCase() },
            { section_code: section_code.toUpperCase() }
        ];
    } else {
        whereCondition.section_name = section_name.toLowerCase();
    }

    const existingSection = await SectionMaster.findOne({
        where: whereCondition
    });

    if (existingSection) {
        throw new ApiError(400, "Section with this name or code already exists");
    }

    const sectionMaster = await SectionMaster.create({
        section_name: section_name.toLowerCase(),
        section_code: section_code ? section_code.toUpperCase() : null,
        display_order: display_order || 0,
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
    const { 
        section_name, 
        section_code, 
        display_order,
        description, 
        is_active 
    } = req.body;
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

    // Check if new name or code already exists (excluding current section)
    if (section_name || section_code) {
        const whereCondition = {
            id: { [Op.ne]: id },
            is_deleted: false
        };
        
        if (section_name && section_code) {
            whereCondition[Op.or] = [
                { section_name: section_name.toLowerCase() },
                { section_code: section_code.toUpperCase() }
            ];
        } else if (section_name) {
            whereCondition.section_name = section_name.toLowerCase();
        } else if (section_code) {
            whereCondition.section_code = section_code.toUpperCase();
        }

        const existingSection = await SectionMaster.findOne({
            where: whereCondition
        });

        if (existingSection) {
            throw new ApiError(400, "Section with this name or code already exists");
        }
    }

    const oldValues = {
        section_name: sectionMaster.section_name,
        section_code: sectionMaster.section_code,
        display_order: sectionMaster.display_order,
        description: sectionMaster.description,
        is_active: sectionMaster.is_active
    };

    await sectionMaster.update({
        section_name: section_name ? section_name.toLowerCase() : sectionMaster.section_name,
        section_code: section_code !== undefined ? (section_code ? section_code.toUpperCase() : null) : sectionMaster.section_code,
        display_order: display_order !== undefined ? display_order : sectionMaster.display_order,
        description: description !== undefined ? description : sectionMaster.description,
        is_active: is_active !== undefined ? is_active : sectionMaster.is_active,
        updated_by: req.user.id
    });

    const changes = {};
    if (section_name && section_name.toLowerCase() !== oldValues.section_name) {
        changes.section_name = { from: oldValues.section_name, to: section_name.toLowerCase() };
    }
    if (section_code !== oldValues.section_code) {
        changes.section_code = { from: oldValues.section_code, to: section_code ? section_code.toUpperCase() : null };
    }
    if (display_order !== oldValues.display_order) {
        changes.display_order = { from: oldValues.display_order, to: display_order };
    }
    if (description !== oldValues.description) {
        changes.description = { from: oldValues.description, to: description };
    }
    if (is_active !== oldValues.is_active) {
        changes.is_active = { from: oldValues.is_active, to: is_active };
    }

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

    // Check if section is being used in any academic year or student records
    const usageChecks = await Promise.all([
        // Check if any students are using this section
        Student.count({
            where: {
                section_id: id,
                is_deleted: false
            }
        }),
        // Check if any academic year has this section assigned
        AcademicYear.count({
            where: {
                section_id: id,
                is_deleted: false
            }
        })
    ]);

    const [studentCount, academicYearCount] = usageChecks;

    if (studentCount > 0) {
        throw new ApiError(400, `Cannot delete section '${sectionMaster.section_name}' as it is being used by ${studentCount} student(s). Please remove all student associations first.`);
    }

    if (academicYearCount > 0) {
        throw new ApiError(400, `Cannot delete section '${sectionMaster.section_name}' as it is being used in ${academicYearCount} academic year(s). Please remove all academic year associations first.`);
    }

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

// ==================== SUBJECT MASTER CONTROLLERS ====================

const createSubjectMaster = asynchandler(async (req, res) => {
    const { 
        subject_name, 
        subject_code, 
        subject_type,
        display_order,
        description,
        is_active = true 
    } = req.body;
    const { SubjectMaster } = req.tenantModels;

    // Validate required fields
    if (!subject_name) {
        throw new ApiError(400, "Subject name is required");
    }

    // Check if subject with same name or code exists
    const whereCondition = {
        is_deleted: false
    };
    
    if (subject_code) {
        whereCondition[Op.or] = [
            { subject_name: subject_name.toLowerCase() },
            { subject_code: subject_code.toUpperCase() }
        ];
    } else {
        whereCondition.subject_name = subject_name.toLowerCase();
    }

    const existingSubject = await SubjectMaster.findOne({
        where: whereCondition
    });

    if (existingSubject) {
        throw new ApiError(400, "Subject with this name or code already exists");
    }

    const subjectMaster = await SubjectMaster.create({
        subject_name: subject_name.toLowerCase(),
        subject_code: subject_code ? subject_code.toUpperCase() : null,
        subject_type: subject_type || 'academic',
        display_order: display_order || 0,
        description,
        is_active,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, subjectMaster, `Subject '${subject_name}' created successfully by ${req.user.email}`)
    );
});

const getAllSubjectMasters = asynchandler(async (req, res) => {
    const { SubjectMaster } = req.tenantModels;
    const { include_deleted = false, is_active, subject_type } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (is_active !== undefined) {
        whereCondition.is_active = is_active === 'true';
    }

    if (subject_type) {
        whereCondition.subject_type = subject_type;
    }

    const subjectMasters = await SubjectMaster.findAll({
        where: whereCondition,
        order: [['display_order', 'ASC'], ['subject_name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, subjectMasters, "Subject masters fetched successfully")
    );
});

const getSubjectMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SubjectMaster } = req.tenantModels;

    const subjectMaster = await SubjectMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!subjectMaster) {
        throw new ApiError(404, "Subject master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, subjectMaster, "Subject master fetched successfully")
    );
});

const updateSubjectMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { 
        subject_name, 
        subject_code, 
        subject_type,
        display_order,
        description, 
        is_active 
    } = req.body;
    const { SubjectMaster } = req.tenantModels;

    const subjectMaster = await SubjectMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!subjectMaster) {
        throw new ApiError(404, "Subject master not found");
    }

    // Check if new name or code already exists (excluding current subject)
    if (subject_name || subject_code) {
        const whereCondition = {
            id: { [Op.ne]: id },
            is_deleted: false
        };
        
        if (subject_name && subject_code) {
            whereCondition[Op.or] = [
                { subject_name: subject_name.toLowerCase() },
                { subject_code: subject_code.toUpperCase() }
            ];
        } else if (subject_name) {
            whereCondition.subject_name = subject_name.toLowerCase();
        } else if (subject_code) {
            whereCondition.subject_code = subject_code.toUpperCase();
        }

        const existingSubject = await SubjectMaster.findOne({
            where: whereCondition
        });

        if (existingSubject) {
            throw new ApiError(400, "Subject with this name or code already exists");
        }
    }

    const oldValues = {
        subject_name: subjectMaster.subject_name,
        subject_code: subjectMaster.subject_code,
        subject_type: subjectMaster.subject_type,
        display_order: subjectMaster.display_order,
        description: subjectMaster.description,
        is_active: subjectMaster.is_active
    };

    await subjectMaster.update({
        subject_name: subject_name ? subject_name.toLowerCase() : subjectMaster.subject_name,
        subject_code: subject_code !== undefined ? (subject_code ? subject_code.toUpperCase() : null) : subjectMaster.subject_code,
        subject_type: subject_type || subjectMaster.subject_type,
        display_order: display_order !== undefined ? display_order : subjectMaster.display_order,
        description: description !== undefined ? description : subjectMaster.description,
        is_active: is_active !== undefined ? is_active : subjectMaster.is_active,
        updated_by: req.user.id
    });

    const changes = {};
    if (subject_name && subject_name.toLowerCase() !== oldValues.subject_name) {
        changes.subject_name = { from: oldValues.subject_name, to: subject_name.toLowerCase() };
    }
    if (subject_code !== oldValues.subject_code) {
        changes.subject_code = { from: oldValues.subject_code, to: subject_code ? subject_code.toUpperCase() : null };
    }
    if (subject_type !== oldValues.subject_type) {
        changes.subject_type = { from: oldValues.subject_type, to: subject_type };
    }
    if (display_order !== oldValues.display_order) {
        changes.display_order = { from: oldValues.display_order, to: display_order };
    }
    if (description !== oldValues.description) {
        changes.description = { from: oldValues.description, to: description };
    }
    if (is_active !== oldValues.is_active) {
        changes.is_active = { from: oldValues.is_active, to: is_active };
    }

    return res.status(200).json(
        new ApiResponse(200, {
            ...subjectMaster.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Subject master updated successfully by ${req.user.email}`)
    );
});

const deleteSubjectMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SubjectMaster } = req.tenantModels;

    const subjectMaster = await SubjectMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!subjectMaster) {
        throw new ApiError(404, "Subject master not found");
    }

    // TODO: Add usage checks when student-subject and academic year-subject relationships are implemented

    await subjectMaster.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: subjectMaster.id,
            subject_name: subjectMaster.subject_name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Subject master '${subjectMaster.subject_name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreSubjectMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { SubjectMaster } = req.tenantModels;

    const subjectMaster = await SubjectMaster.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!subjectMaster) {
        throw new ApiError(404, "Deleted subject master not found");
    }

    await subjectMaster.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: subjectMaster.id,
            subject_name: subjectMaster.subject_name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Subject master '${subjectMaster.subject_name}' restored successfully by ${req.user.email}`)
    );
});

// ==================== HOUSE MASTER CONTROLLERS ====================

const createHouseMaster = asynchandler(async (req, res) => {
    const { 
        house_name, 
        house_code, 
        house_color,
        display_order,
        description,
        is_active = true 
    } = req.body;
    const { HouseMaster } = req.tenantModels;

    // Validate required fields
    if (!house_name) {
        throw new ApiError(400, "House name is required");
    }

    // Check if house with same name or code exists
    const whereCondition = {
        is_deleted: false
    };
    
    if (house_code) {
        whereCondition[Op.or] = [
            { house_name: house_name.toLowerCase() },
            { house_code: house_code.toUpperCase() }
        ];
    } else {
        whereCondition.house_name = house_name.toLowerCase();
    }

    const existingHouse = await HouseMaster.findOne({
        where: whereCondition
    });

    if (existingHouse) {
        throw new ApiError(400, "House with this name or code already exists");
    }

    const houseMaster = await HouseMaster.create({
        house_name: house_name.toLowerCase(),
        house_code: house_code ? house_code.toUpperCase() : null,
        house_color: house_color || null,
        display_order: display_order || 0,
        description,
        is_active,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, houseMaster, `House '${house_name}' created successfully by ${req.user.email}`)
    );
});

const getAllHouseMasters = asynchandler(async (req, res) => {
    const { HouseMaster } = req.tenantModels;
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

    const houseMasters = await HouseMaster.findAll({
        where: whereCondition,
        order: [['display_order', 'ASC'], ['house_name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, houseMasters, "House masters fetched successfully")
    );
});

const getHouseMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { HouseMaster } = req.tenantModels;

    const houseMaster = await HouseMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!houseMaster) {
        throw new ApiError(404, "House master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, houseMaster, "House master fetched successfully")
    );
});

const updateHouseMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { 
        house_name, 
        house_code, 
        house_color,
        display_order,
        description, 
        is_active 
    } = req.body;
    const { HouseMaster } = req.tenantModels;

    const houseMaster = await HouseMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!houseMaster) {
        throw new ApiError(404, "House master not found");
    }

    // Check if new name or code already exists (excluding current house)
    if (house_name || house_code) {
        const whereCondition = {
            id: { [Op.ne]: id },
            is_deleted: false
        };
        
        if (house_name && house_code) {
            whereCondition[Op.or] = [
                { house_name: house_name.toLowerCase() },
                { house_code: house_code.toUpperCase() }
            ];
        } else if (house_name) {
            whereCondition.house_name = house_name.toLowerCase();
        } else if (house_code) {
            whereCondition.house_code = house_code.toUpperCase();
        }

        const existingHouse = await HouseMaster.findOne({
            where: whereCondition
        });

        if (existingHouse) {
            throw new ApiError(400, "House with this name or code already exists");
        }
    }

    const oldValues = {
        house_name: houseMaster.house_name,
        house_code: houseMaster.house_code,
        house_color: houseMaster.house_color,
        display_order: houseMaster.display_order,
        description: houseMaster.description,
        is_active: houseMaster.is_active
    };

    await houseMaster.update({
        house_name: house_name ? house_name.toLowerCase() : houseMaster.house_name,
        house_code: house_code !== undefined ? (house_code ? house_code.toUpperCase() : null) : houseMaster.house_code,
        house_color: house_color !== undefined ? house_color : houseMaster.house_color,
        display_order: display_order !== undefined ? display_order : houseMaster.display_order,
        description: description !== undefined ? description : houseMaster.description,
        is_active: is_active !== undefined ? is_active : houseMaster.is_active,
        updated_by: req.user.id
    });

    const changes = {};
    if (house_name && house_name.toLowerCase() !== oldValues.house_name) {
        changes.house_name = { from: oldValues.house_name, to: house_name.toLowerCase() };
    }
    if (house_code !== oldValues.house_code) {
        changes.house_code = { from: oldValues.house_code, to: house_code ? house_code.toUpperCase() : null };
    }
    if (house_color !== oldValues.house_color) {
        changes.house_color = { from: oldValues.house_color, to: house_color };
    }
    if (display_order !== oldValues.display_order) {
        changes.display_order = { from: oldValues.display_order, to: display_order };
    }
    if (description !== oldValues.description) {
        changes.description = { from: oldValues.description, to: description };
    }
    if (is_active !== oldValues.is_active) {
        changes.is_active = { from: oldValues.is_active, to: is_active };
    }

    return res.status(200).json(
        new ApiResponse(200, {
            ...houseMaster.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `House master updated successfully by ${req.user.email}`)
    );
});

const deleteHouseMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { HouseMaster } = req.tenantModels;

    const houseMaster = await HouseMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!houseMaster) {
        throw new ApiError(404, "House master not found");
    }

    // TODO: Add usage checks when student-house and academic year-house relationships are implemented

    await houseMaster.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: houseMaster.id,
            house_name: houseMaster.house_name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `House master '${houseMaster.house_name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreHouseMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { HouseMaster } = req.tenantModels;

    const houseMaster = await HouseMaster.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!houseMaster) {
        throw new ApiError(404, "Deleted house master not found");
    }

    await houseMaster.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: houseMaster.id,
            house_name: houseMaster.house_name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `House master '${houseMaster.house_name}' restored successfully by ${req.user.email}`)
    );
});

// ==================== FEE CATEGORY MASTER CONTROLLERS ====================

const createFeeCategoryMaster = asynchandler(async (req, res) => {
    const { 
        category_name, 
        category_code, 
        category_type,
        description,
        is_active = true 
    } = req.body;
    const { FeeCategoryMaster } = req.tenantModels;

    // Validate required fields
    if (!category_name) {
        throw new ApiError(400, "Fee category name is required");
    }

    // Check if fee category with same name or code exists
    const whereCondition = {
        is_deleted: false
    };
    
    if (category_code) {
        whereCondition[Op.or] = [
            { category_name: category_name.toLowerCase() },
            { category_code: category_code.toUpperCase() }
        ];
    } else {
        whereCondition.category_name = category_name.toLowerCase();
    }

    const existingCategory = await FeeCategoryMaster.findOne({
        where: whereCondition
    });

    if (existingCategory) {
        throw new ApiError(400, "Fee category with this name or code already exists");
    }

    const feeCategoryMaster = await FeeCategoryMaster.create({
        category_name: category_name.toLowerCase(),
        category_code: category_code ? category_code.toUpperCase() : null,
        category_type: category_type || 'mandatory',
        description,
        is_active,
        created_by: req.user.id,
        updated_by: req.user.id
    });

    return res.status(201).json(
        new ApiResponse(201, feeCategoryMaster, `Fee category '${category_name}' created successfully by ${req.user.email}`)
    );
});

const getAllFeeCategoryMasters = asynchandler(async (req, res) => {
    const { FeeCategoryMaster } = req.tenantModels;
    const { include_deleted = false, is_active, category_type } = req.query;

    const whereCondition = {};
    
    // Convert string to boolean for include_deleted
    const includeDeleted = include_deleted === 'true' || include_deleted === true;
    
    if (!includeDeleted) {
        whereCondition.is_deleted = false;
    }
    
    if (is_active !== undefined) {
        whereCondition.is_active = is_active === 'true';
    }

    if (category_type) {
        whereCondition.category_type = category_type;
    }

    const feeCategoryMasters = await FeeCategoryMaster.findAll({
        where: whereCondition,
        order: [['category_name', 'ASC']]
    });

    return res.status(200).json(
        new ApiResponse(200, feeCategoryMasters, "Fee category masters fetched successfully")
    );
});

const getFeeCategoryMasterById = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { FeeCategoryMaster } = req.tenantModels;

    const feeCategoryMaster = await FeeCategoryMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!feeCategoryMaster) {
        throw new ApiError(404, "Fee category master not found");
    }

    return res.status(200).json(
        new ApiResponse(200, feeCategoryMaster, "Fee category master fetched successfully")
    );
});

const updateFeeCategoryMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { 
        category_name, 
        category_code, 
        category_type,
        description, 
        is_active 
    } = req.body;
    const { FeeCategoryMaster } = req.tenantModels;

    const feeCategoryMaster = await FeeCategoryMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!feeCategoryMaster) {
        throw new ApiError(404, "Fee category master not found");
    }

    // Check if new name or code already exists (excluding current category)
    if (category_name || category_code) {
        const whereCondition = {
            id: { [Op.ne]: id },
            is_deleted: false
        };
        
        if (category_name && category_code) {
            whereCondition[Op.or] = [
                { category_name: category_name.toLowerCase() },
                { category_code: category_code.toUpperCase() }
            ];
        } else if (category_name) {
            whereCondition.category_name = category_name.toLowerCase();
        } else if (category_code) {
            whereCondition.category_code = category_code.toUpperCase();
        }

        const existingCategory = await FeeCategoryMaster.findOne({
            where: whereCondition
        });

        if (existingCategory) {
            throw new ApiError(400, "Fee category with this name or code already exists");
        }
    }

    const oldValues = {
        category_name: feeCategoryMaster.category_name,
        category_code: feeCategoryMaster.category_code,
        category_type: feeCategoryMaster.category_type,
        description: feeCategoryMaster.description,
        is_active: feeCategoryMaster.is_active
    };

    await feeCategoryMaster.update({
        category_name: category_name ? category_name.toLowerCase() : feeCategoryMaster.category_name,
        category_code: category_code !== undefined ? (category_code ? category_code.toUpperCase() : null) : feeCategoryMaster.category_code,
        category_type: category_type || feeCategoryMaster.category_type,
        description: description !== undefined ? description : feeCategoryMaster.description,
        is_active: is_active !== undefined ? is_active : feeCategoryMaster.is_active,
        updated_by: req.user.id
    });

    const changes = {};
    if (category_name && category_name.toLowerCase() !== oldValues.category_name) {
        changes.category_name = { from: oldValues.category_name, to: category_name.toLowerCase() };
    }
    if (category_code !== oldValues.category_code) {
        changes.category_code = { from: oldValues.category_code, to: category_code ? category_code.toUpperCase() : null };
    }
    if (category_type !== oldValues.category_type) {
        changes.category_type = { from: oldValues.category_type, to: category_type };
    }
    if (description !== oldValues.description) {
        changes.description = { from: oldValues.description, to: description };
    }
    if (is_active !== oldValues.is_active) {
        changes.is_active = { from: oldValues.is_active, to: is_active };
    }

    return res.status(200).json(
        new ApiResponse(200, {
            ...feeCategoryMaster.toJSON(),
            changes_made: Object.keys(changes).length > 0 ? changes : null
        }, `Fee category master updated successfully by ${req.user.email}`)
    );
});

const deleteFeeCategoryMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { FeeCategoryMaster } = req.tenantModels;

    const feeCategoryMaster = await FeeCategoryMaster.findOne({
        where: {
            id,
            is_deleted: false
        }
    });

    if (!feeCategoryMaster) {
        throw new ApiError(404, "Fee category master not found");
    }

    await feeCategoryMaster.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: feeCategoryMaster.id,
            category_name: feeCategoryMaster.category_name,
            deleted_by: req.user.id,
            deleted_by_name: req.user.email,
            deleted_at: new Date()
        }, `Fee category master '${feeCategoryMaster.category_name}' deleted successfully by ${req.user.email}`)
    );
});

const restoreFeeCategoryMaster = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { FeeCategoryMaster } = req.tenantModels;

    const feeCategoryMaster = await FeeCategoryMaster.findOne({
        where: {
            id,
            is_deleted: true
        }
    });

    if (!feeCategoryMaster) {
        throw new ApiError(404, "Deleted fee category master not found");
    }

    await feeCategoryMaster.update({
        is_deleted: false,
        deleted_at: null,
        updated_by: req.user.id
    });

    return res.status(200).json(
        new ApiResponse(200, {
            id: feeCategoryMaster.id,
            category_name: feeCategoryMaster.category_name,
            restored_by: req.user.id,
            restored_by_name: req.user.email,
            restored_at: new Date()
        }, `Fee category master '${feeCategoryMaster.category_name}' restored successfully by ${req.user.email}`)
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
    restoreSectionMaster,
    
    // Subject Master
    createSubjectMaster,
    getAllSubjectMasters,
    getSubjectMasterById,
    updateSubjectMaster,
    deleteSubjectMaster,
    restoreSubjectMaster,
    
    // House Master
    createHouseMaster,
    getAllHouseMasters,
    getHouseMasterById,
    updateHouseMaster,
    deleteHouseMaster,
    restoreHouseMaster,
    
    // Fee Category Master
    createFeeCategoryMaster,
    getAllFeeCategoryMasters,
    getFeeCategoryMasterById,
    updateFeeCategoryMaster,
    deleteFeeCategoryMaster,
    restoreFeeCategoryMaster
};
