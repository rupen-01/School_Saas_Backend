import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asynchandler from "../utils/asyncHandler.js";

const createModule = asynchandler(async(req,res)=>{
    const {
        name,
        description,
        subModules = []
    } = req.body
    const { Module, SubModule } = req.app.locals.models
    const sequelize = req.app.locals.sequelize || req.app.get('sequelize');
    console.log("Creating module with name:", name);

    const findModule = await Module.findOne({where:{name:name.toLowerCase()}})
    if(findModule)
    {
        throw new ApiError(400,"This module already exists.Please try with another name")
    }

    // sanitize subModules
    const sanitizedSubs = Array.isArray(subModules)
      ? subModules
          .filter(sm => sm && sm.name !== undefined && sm.name !== null && sm.price !== undefined)
          .map(sm => ({
            name: String(sm.name).trim().toLowerCase(),
            price: Number(sm.price)
          }))
      : [];

    // validations: non-negative price and duplicate names
    for (const sm of sanitizedSubs) {
      if (Number.isNaN(sm.price) || sm.price < 0) {
        throw new ApiError(400, `Sub module price must be a non-negative number for '${sm.name}'`);
      }
    }
    const namesSet = new Set();
    for (const sm of sanitizedSubs) {
      if (namesSet.has(sm.name)) {
        throw new ApiError(400, `Duplicate sub module name: '${sm.name}'`);
      }
      namesSet.add(sm.name);
    }
    const totalPrice = sanitizedSubs.reduce((sum, sm) => sum + Number(sm.price || 0), 0);

    const tx = await sequelize.transaction();
    try {
        const module = await Module.create({
            name: name.toLowerCase(),
            description,
            totalPrice
        }, { transaction: tx });

        if (sanitizedSubs.length > 0) {
            const rows = sanitizedSubs.map(sm => ({
                moduleId: module.id,
                name: sm.name,
                price: sm.price
            }));
            await SubModule.bulkCreate(rows, { transaction: tx });
        }

        await tx.commit();

        return res
        .status(201)
        .json(new ApiResponse(201, module, "module created successfully"))
    } catch (err) {
        await tx.rollback();
        throw err;
    }

})

const getAllModules = asynchandler(async (req, res) => {
  const { Module, SubModule } = req.app.locals.models;

  const modules = await Module.findAll({
    include: [{ model: SubModule, as: 'subModules' }]
  });

  return res
    .status(200)
    .json(new ApiResponse(200, modules, "Modules fetched successfully"));
});

const getModuleById = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { Module, SubModule } = req.app.locals.models;

  const module = await Module.findByPk(id, {
    include: [{ model: SubModule, as: 'subModules' }]
  });
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, module, "Module fetched successfully"));
});

const updateModule = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, subModules = [] } = req.body;
  const { Module, SubModule } = req.app.locals.models;
  const sequelize = req.app.locals.sequelize || req.app.get('sequelize');

  const module = await Module.findByPk(id);
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  if (name) {
    const findModule = await Module.findOne({ where: { name: name.toLowerCase() } });
    if (findModule && findModule.id !== id) {
        throw new ApiError(400, "This module already exists. Please try with another name");
    }
  }

  // sanitize subModules
  const sanitizedSubs = Array.isArray(subModules)
    ? subModules
        .filter(sm => sm && sm.name !== undefined && sm.name !== null && sm.price !== undefined)
        .map(sm => ({
          name: String(sm.name).trim().toLowerCase(),
          price: Number(sm.price)
        }))
    : [];

  // validations: non-negative price and duplicate names
  if (Array.isArray(subModules)) {
    for (const sm of sanitizedSubs) {
      if (Number.isNaN(sm.price) || sm.price < 0) {
        throw new ApiError(400, `Sub module price must be a non-negative number for '${sm.name}'`);
      }
    }
    const namesSet = new Set();
    for (const sm of sanitizedSubs) {
      if (namesSet.has(sm.name)) {
        throw new ApiError(400, `Duplicate sub module name: '${sm.name}'`);
      }
      namesSet.add(sm.name);
    }
  }
  const totalPrice = sanitizedSubs.length > 0
    ? sanitizedSubs.reduce((sum, sm) => sum + Number(sm.price || 0), 0)
    : module.totalPrice; // if subModules not provided, keep previous

  const tx = await sequelize.transaction();
  try {
    module.name = name || module.name;
    module.description = description || module.description;
    if (Array.isArray(subModules)) {
      module.totalPrice = totalPrice;
    }
    await module.save({ transaction: tx });

    if (Array.isArray(subModules)) {
      // Replace existing sub-modules
      await SubModule.destroy({ where: { moduleId: module.id }, transaction: tx });
      if (sanitizedSubs.length > 0) {
        const rows = sanitizedSubs.map(sm => ({ moduleId: module.id, name: sm.name, price: sm.price }));
        await SubModule.bulkCreate(rows, { transaction: tx });
      }
    }

    await tx.commit();

  return res
    .status(200)
    .json(new ApiResponse(200, module, "Module updated successfully"));
  } catch (err) {
    await tx.rollback();
    throw err;
  }
});

const deleteModule = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { Module } = req.app.locals.models;

  const module = await Module.findByPk(id);
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  await module.destroy();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Module deleted successfully"));
});

export {
    createModule,
    getAllModules,
    getModuleById,
    updateModule,
    deleteModule
}
