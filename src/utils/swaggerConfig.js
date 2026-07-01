import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

// Load main swagger spec
const loadMainSwaggerSpec = () => {
  try {
    const mainSwaggerPath = path.join(process.cwd(), 'src/utils/swagger.json');
    return JSON.parse(fs.readFileSync(mainSwaggerPath, 'utf8'));
  } catch (error) {
    console.error('Error loading main swagger spec:', error);
    return {};
  }
};

// Load academic year swagger spec
const loadAcademicYearSpec = () => {
  try {
    const academicYearPath = path.join(process.cwd(), 'src/utils/swagger/academicYear.swagger.json');
    return JSON.parse(fs.readFileSync(academicYearPath, 'utf8'));
  } catch (error) {
    console.error('Error loading academic year swagger spec:', error);
    return {};
  }
};

// Load academic year classes swagger spec
const loadAcademicYearClassesSpec = () => {
  try {
    const academicYearClassesPath = path.join(process.cwd(), 'src/utils/swagger/academicYearClasses.swagger.json');
    return JSON.parse(fs.readFileSync(academicYearClassesPath, 'utf8'));
  } catch (error) {
    console.error('Error loading academic year classes swagger spec:', error);
    return {};
  }
};

// Load academic year class sections swagger spec
const loadAcademicYearClassSectionsSpec = () => {
  try {
    const academicYearClassSectionsPath = path.join(process.cwd(), 'src/utils/swagger/academicYearClassSections.swagger.json');
    return JSON.parse(fs.readFileSync(academicYearClassSectionsPath, 'utf8'));
  } catch (error) {
    console.error('Error loading academic year class sections swagger spec:', error);
    return {};
  }
};

// Load academic year subjects swagger spec
const loadAcademicYearSubjectsSpec = () => {
  try {
    const academicYearSubjectsPath = path.join(process.cwd(), 'src/utils/swagger/academicYearSubjects.swagger.json');
    return JSON.parse(fs.readFileSync(academicYearSubjectsPath, 'utf8'));
  } catch (error) {
    console.error('Error loading academic year subjects swagger spec:', error);
    return {};
  }
};

// Load academic year fee structure swagger spec
const loadAcademicYearFeeStructureSpec = () => {
  try {
    const academicYearFeeStructurePath = path.join(process.cwd(), 'src/utils/swagger/academicYearFeeStructure.swagger.json');
    return JSON.parse(fs.readFileSync(academicYearFeeStructurePath, 'utf8'));
  } catch (error) {
    console.error('Error loading academic year fee structure swagger spec:', error);
    return {};
  }
};

// Load role management swagger spec
const loadRoleManagementSpec = () => {
  try {
    const roleManagementPath = path.join(process.cwd(), 'src/utils/swagger/roleManagement.swagger.json');
    return JSON.parse(fs.readFileSync(roleManagementPath, 'utf8'));
  } catch (error) {
    console.error('Error loading role management swagger spec:', error);
    return {};
  }
};

// Merge all swagger specs into one
const mergeSwaggerSpecs = () => {
  const mainSpec = loadMainSwaggerSpec();
  const academicYearSpec = loadAcademicYearSpec();
  const academicYearClassesSpec = loadAcademicYearClassesSpec();
  const academicYearClassSectionsSpec = loadAcademicYearClassSectionsSpec();
  const academicYearSubjectsSpec = loadAcademicYearSubjectsSpec();
  const academicYearFeeStructureSpec = loadAcademicYearFeeStructureSpec();
  const roleManagementSpec = loadRoleManagementSpec();
  
  // Merge paths
  if (academicYearSpec.paths) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...academicYearSpec.paths
    };
  }
  
  if (academicYearClassesSpec.paths) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...academicYearClassesSpec.paths
    };
  }
  
  if (academicYearClassSectionsSpec.paths) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...academicYearClassSectionsSpec.paths
    };
  }
  
  if (academicYearSubjectsSpec.paths) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...academicYearSubjectsSpec.paths
    };
  }
  
  if (academicYearFeeStructureSpec.paths) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...academicYearFeeStructureSpec.paths
    };
  }
  
  // Merge tags
  if (academicYearSpec.tags) {
    mainSpec.tags = [
      ...(mainSpec.tags || []),
      ...academicYearSpec.tags
    ];
  }
  
  if (academicYearClassesSpec.tags) {
    mainSpec.tags = [
      ...(mainSpec.tags || []),
      ...academicYearClassesSpec.tags
    ];
  }
  
  if (academicYearClassSectionsSpec.tags) {
    mainSpec.tags = [
      ...(mainSpec.tags || []),
      ...academicYearClassSectionsSpec.tags
    ];
  }
  
  if (academicYearSubjectsSpec.tags) {
    mainSpec.tags = [
      ...(mainSpec.tags || []),
      ...academicYearSubjectsSpec.tags
    ];
  }
  
  if (academicYearFeeStructureSpec.tags) {
    mainSpec.tags = [
      ...(mainSpec.tags || []),
      ...academicYearFeeStructureSpec.tags
    ];
  }
  
  // Merge components
  if (academicYearSpec.components) {
    mainSpec.components = {
      ...mainSpec.components,
      ...academicYearSpec.components
    };
  }
  
  if (academicYearClassesSpec.components) {
    mainSpec.components = {
      ...mainSpec.components,
      ...academicYearClassesSpec.components
    };
  }
  
  if (academicYearClassSectionsSpec.components) {
    mainSpec.components = {
      ...mainSpec.components,
      ...academicYearClassSectionsSpec.components
    };
  }
  
  if (academicYearSubjectsSpec.components) {
    mainSpec.components = {
      ...mainSpec.components,
      ...academicYearSubjectsSpec.components
    };
  }
  
  if (academicYearFeeStructureSpec.components) {
    mainSpec.components = {
      ...mainSpec.components,
      ...academicYearFeeStructureSpec.components
    };
  }
  
  // Merge role management spec
  if (roleManagementSpec) {
    mainSpec.paths = {
      ...mainSpec.paths,
      ...roleManagementSpec
    };
  }
  
  return mainSpec;
};

export const setupSwagger = (app) => {
  const swaggerSpec = mergeSwaggerSpecs();
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  console.log('📚 Swagger documentation available at /api-docs');
};