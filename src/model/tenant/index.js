import DepartmentModel from './department.model.js';
import LeaveTypeModel from './leaveType.model.js';
import LeavePolicyModel from './leavePolicy.model.js';
import LeavePolicyDepartmentModel from './leavePolicyDepartment.model.js';
import StudentModel from './student.model.js';
import AcademicYearModel from './academicYear/academicYear.model.js';
import ClassMasterModel from './classMaster.model.js';
import SectionMasterModel from './sectionMaster.model.js';
import SubjectMasterModel from './subjectMaster.model.js';
import HouseMasterModel from './houseMaster.model.js';
import FeeCategoryMasterModel from './feeCategoryMaster.model.js';
import AcademicYearClassesModel from './academicYear/academicYearClasses.model.js';
import AcademicYearClassSectionsModel from './academicYear/academicYearClassSections.model.js';
import AcademicYearSubjectsModel from './academicYear/academicYearSubjects.model.js';
import AcademicYearFeeStructureModel from './academicYear/academicYearFeeStructure.model.js';
import RoleMasterModel from './roleMaster.model.js';
import RoleModulePermissionsModel from './roleModulePermissions.model.js';

export const createTenantModels = (sequelize, schemaName) => {
    console.log(`\n🔄 ===== CREATING TENANT MODELS =====`);
    console.log(`🏢 Schema: ${schemaName}`);
    console.log(`🔧 Sequelize: ${sequelize ? 'Available' : 'Not Available'}`);
    
    if (!sequelize) {
        throw new Error('Sequelize instance is required for tenant models');
    }
    
    if (!schemaName) {
        throw new Error('Schema name is required for tenant models');
    }

    const models = {};

    // Initialize all tenant models
    console.log(`🔄 Initializing Department model...`);
    models.Department = DepartmentModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing LeaveType model...`);
    models.LeaveType = LeaveTypeModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing LeavePolicy model...`);
    models.LeavePolicy = LeavePolicyModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing LeavePolicyDepartment model...`);
    models.LeavePolicyDepartment = LeavePolicyDepartmentModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing Student model...`);
    models.Student = StudentModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing AcademicYear model...`);
    models.AcademicYear = AcademicYearModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing ClassMaster model...`);
    models.ClassMaster = ClassMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing SectionMaster model...`);
    models.SectionMaster = SectionMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing SubjectMaster model...`);
    models.SubjectMaster = SubjectMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing HouseMaster model...`);
    models.HouseMaster = HouseMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing FeeCategoryMaster model...`);
    models.FeeCategoryMaster = FeeCategoryMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing AcademicYearClasses model...`);
    models.AcademicYearClasses = AcademicYearClassesModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing AcademicYearClassSections model...`);
    models.AcademicYearClassSections = AcademicYearClassSectionsModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing AcademicYearSubjects model...`);
    models.AcademicYearSubjects = AcademicYearSubjectsModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing AcademicYearFeeStructure model...`);
    models.AcademicYearFeeStructure = AcademicYearFeeStructureModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing RoleMaster model...`);
    models.RoleMaster = RoleMasterModel(sequelize, schemaName);
    
    console.log(`🔄 Initializing RoleModulePermissions model...`);
    models.RoleModulePermissions = RoleModulePermissionsModel(sequelize, schemaName);

    console.log(`📋 All models initialized: ${Object.keys(models).join(', ')}`);
    console.log(`📊 Total models: ${Object.keys(models).length}`);

    // Define all associations here
    console.log(`🔄 Setting up associations...`);
    
    // LeaveType associations
    models.LeaveType.hasMany(models.LeavePolicy, {
        foreignKey: 'leave_type_id',
        as: 'policies'
    });

    // LeavePolicy associations
    models.LeavePolicy.belongsTo(models.LeaveType, {
        foreignKey: 'leave_type_id',
        as: 'leaveType'
    });

    // Many-to-many relationship between LeavePolicy and Department
    models.LeavePolicy.belongsToMany(models.Department, {
        through: models.LeavePolicyDepartment,
        foreignKey: 'leave_policy_id',
        otherKey: 'department_id',
        as: 'departments'
    });

    models.Department.belongsToMany(models.LeavePolicy, {
        through: models.LeavePolicyDepartment,
        foreignKey: 'department_id',
        otherKey: 'leave_policy_id',
        as: 'leavePolicies'
    });

    // LeavePolicyDepartment associations
    models.LeavePolicyDepartment.belongsTo(models.LeavePolicy, {
        foreignKey: 'leave_policy_id',
        as: 'leavePolicy'
    });

    models.LeavePolicyDepartment.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
    });

    // Academic Year Classes associations
    models.AcademicYear.hasMany(models.AcademicYearClasses, {
        foreignKey: 'academic_year_id',
        as: 'classes'
    });

    models.ClassMaster.hasMany(models.AcademicYearClasses, {
        foreignKey: 'class_master_id',
        as: 'academicYearClasses'
    });

    models.AcademicYearClasses.belongsTo(models.AcademicYear, {
        foreignKey: 'academic_year_id',
        as: 'academicYear'
    });

    models.AcademicYearClasses.belongsTo(models.ClassMaster, {
        foreignKey: 'class_master_id',
        as: 'classMaster'
    });

    // Academic Year Class Sections associations
    models.AcademicYearClassSections.belongsTo(models.AcademicYear, {
        foreignKey: 'academic_year_id',
        as: 'academicYear'
    });

    models.AcademicYearClassSections.belongsTo(models.ClassMaster, {
        foreignKey: 'class_master_id',
        as: 'classMaster'
    });

    models.AcademicYearClassSections.belongsTo(models.SectionMaster, {
        foreignKey: 'section_master_id',
        as: 'sectionMaster'
    });

    // Academic Year Subjects associations
    models.AcademicYearSubjects.belongsTo(models.AcademicYear, {
        foreignKey: 'academic_year_id',
        as: 'academicYear'
    });

    models.AcademicYearSubjects.belongsTo(models.ClassMaster, {
        foreignKey: 'class_master_id',
        as: 'classMaster'
    });

    models.AcademicYearSubjects.belongsTo(models.SubjectMaster, {
        foreignKey: 'subject_master_id',
        as: 'subjectMaster'
    });

    // Academic Year Fee Structure associations
    models.AcademicYearFeeStructure.belongsTo(models.AcademicYear, {
        foreignKey: 'academic_year_id',
        as: 'academicYear'
    });

    models.AcademicYearFeeStructure.belongsTo(models.ClassMaster, {
        foreignKey: 'class_master_id',
        as: 'classMaster'
    });

    models.AcademicYearFeeStructure.belongsTo(models.FeeCategoryMaster, {
        foreignKey: 'fee_category_id',
        as: 'feeCategory'
    });

    // Role and Permission associations
    models.RoleMaster.hasMany(models.RoleModulePermissions, {
        foreignKey: 'role_id',
        as: 'permissions'
    });

    models.RoleModulePermissions.belongsTo(models.RoleMaster, {
        foreignKey: 'role_id',
        as: 'role'
    });

    console.log(`✅ All associations set up successfully`);
    console.log(`🔄 ===== TENANT MODELS CREATED =====\n`);

    return models;
};