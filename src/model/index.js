import SuperAdminModel from './common/superAdmin.model.js';
import SchoolAdminModel from './common/schoolAdmin.model.js';
import UserModel from './common/user.model.js';
import ModuleModel from './common/module.model.js';
import PlanModel from './common/plan.model.js'; // Import Plan model
import SchoolModel from './common/school.model.js';
import SchoolModuleModel from './common/schoolModule.js';
import planModuleModel from './common/planModule.model.js';
import PlanSubModuleModel from './common/planSubModule.model.js';
import SubModuleModel from './common/subModule.model.js';
import RestorePasswordModel from './common/restorePassword.model.js';
import { sequelize } from '../config/database.js';

const db = {};

db.sequelize = sequelize;

// Load models
db.SuperAdmin = SuperAdminModel(sequelize);
db.User = UserModel(sequelize);
db.Plan = PlanModel(sequelize); // Initialize Plan model
db.PlanModule = planModuleModel(sequelize)
db.PlanSubModule = PlanSubModuleModel(sequelize)
db.SchoolAdmin = SchoolAdminModel(sequelize);
db.School = SchoolModel(sequelize, 'public'); // Pass the schema name
db.Module = ModuleModel(sequelize);
db.SchoolModule = SchoolModuleModel(sequelize);
db.SubModule = SubModuleModel(sequelize);
db.RestorePassword = RestorePasswordModel(sequelize);


// School and Plan Association (One-to-Many)
db.Plan.hasMany(db.School, { foreignKey: 'plan', as: 'schools' });
db.School.belongsTo(db.Plan, { foreignKey: 'plan', as: 'plans' });

// We use SchoolModule as the junction table
db.School.belongsToMany(db.Module, {
  through: db.SchoolModule,
  foreignKey: 'schoolId',
  otherKey: 'moduleId',
  as: 'modules'
});

db.Module.belongsToMany(db.School, {
    through: db.SchoolModule,
    foreignKey: 'moduleId',
    otherKey: 'schoolId',
    as: 'schools'
});

// Plan and Module Association (Many-to-Many)
db.Plan.belongsToMany(db.Module, {
  through: db.PlanModule,
  foreignKey: 'planId',
  otherKey: 'moduleId',
  as: 'modules'
});

db.Module.belongsToMany(db.Plan, {
  through: db.PlanModule,
  foreignKey: 'moduleId',
  otherKey: 'planId',
  as: 'plans'
});

// Module and SubModule Association (One-to-Many)
db.Module.hasMany(db.SubModule, {
  foreignKey: 'moduleId',
  as: 'subModules',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
db.SubModule.belongsTo(db.Module, { foreignKey: 'moduleId', as: 'module' });

// Plan and SubModule Association (Many-to-Many through PlanSubModule)
db.Plan.belongsToMany(db.SubModule, {
  through: db.PlanSubModule,
  foreignKey: 'planId',
  otherKey: 'subModuleId',
  as: 'planSubModules'
});

db.SubModule.belongsToMany(db.Plan, {
  through: db.PlanSubModule,
  foreignKey: 'subModuleId',
  otherKey: 'planId',
  as: 'plans'
});

// PlanSubModule associations for easy querying
db.PlanSubModule.belongsTo(db.Plan, { foreignKey: 'planId', as: 'plan' });
db.PlanSubModule.belongsTo(db.Module, { foreignKey: 'moduleId', as: 'module' });
db.PlanSubModule.belongsTo(db.SubModule, { foreignKey: 'subModuleId', as: 'subModule' });

// One-to-One: One School has One SchoolAdmin
db.School.hasOne(db.SchoolAdmin, { foreignKey: 'school_id', as: 'school_admin' });
db.SchoolAdmin.belongsTo(db.School, { foreignKey: 'school_id', as: 'school' });

// User and RestorePassword Association (One-to-Many)
db.User.hasMany(db.RestorePassword, { foreignKey: 'userId', as: 'passwordHistory', onDelete: 'CASCADE' });
db.RestorePassword.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

export default db;