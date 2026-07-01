import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asynchandler from "../utils/asyncHandler.js";
import { Op, QueryTypes } from "sequelize";

const createPlan = asynchandler(async (req, res) => {
    try {
        let {
            name,
            code,
            category,
            status,
            description,
            actualPrice,
            offerPrice,
            billingCycle,
            gst,
            maxStudent,
            maxStaffUser,
            storageLimit,
            minStudentLimit,
            maxStudentLimit,
            perStudentPrice,
            creditCarryForward,
            emailNotification,
            smsAlerts,
            whatsappAlerts,
            customeLogoBranding,
            icon,
            iconColor,
            planPros,
            planCons,
            duration,
            termsAndPolicy,
            adminNotes,
            modules
        } = req.body;

        // Convert planPros and planCons to arrays if they are strings
        if (planPros && typeof planPros === 'string') {
            planPros = planPros.split(',').map(item => item.trim()).filter(item => item);
        }
        if (planCons && typeof planCons === 'string') {
            planCons = planCons.split(',').map(item => item.trim()).filter(item => item);
        }
     
        const { Plan, PlanModule, PlanSubModule, Module, SubModule } = req.app.locals.models;

        const findPlan = await Plan.findOne({
            where: {
                [Op.or]: [
                    { name },
                    { code }
                ]
            }
        });
        if (findPlan) {
            throw new ApiError(400, "Plan with this name or code already exists");
        }

        let finalPrice = actualPrice || 0;
        
        let parsedModules = modules;
        if (typeof modules === 'string') {
            try {
                parsedModules = JSON.parse(modules);
                console.log("Parsed modules from string:", parsedModules);
            } catch (error) {
                console.log("Failed to parse modules string:", error);
            }
        } 
        
        // If parsedModules is a single object, wrap it in an array
        if (parsedModules && typeof parsedModules === 'object' && !Array.isArray(parsedModules)) {
            parsedModules = [parsedModules];
        }
        
        // Normalize modules: expect [{ moduleId, subModules: [IDs] }]
        let normalized = [];
        if (Array.isArray(parsedModules)) {
          normalized = parsedModules
            .filter(it => it && typeof it === 'object' && it.moduleId && Array.isArray(it.subModules))
            .map(it => ({ moduleId: it.moduleId, subModules: it.subModules }));
        }

        // Validate module IDs exist
        if (Array.isArray(normalized) && normalized.length > 0) {
          const moduleIds = [...new Set(normalized.map(n => n.moduleId))];
          const modulesFound = await Module.findAll({ where: { id: { [Op.in]: moduleIds } } });
          if (modulesFound.length !== moduleIds.length) {
            throw new ApiError(400, "Some provided module IDs are invalid");
          }
        }

        // Use actualPrice directly from frontend - no auto calculation
        finalPrice = actualPrice || 0;

        const plan = await Plan.create({
            name,
            code,
            category,
            status,
            description,
            actualPrice: finalPrice,
            offerPrice: offerPrice || null,
            billingCycle,
            gst:gst || null,
            maxStudent:maxStudent || null,
            maxStaffUser:maxStaffUser || null,
            storageLimit:storageLimit || null,
            minStudentLimit:minStudentLimit || null,
            maxStudentLimit:maxStudentLimit || null,
            perStudentPrice:perStudentPrice || null,
            creditCarryForward,
            emailNotification,
            smsAlerts,
            whatsappAlerts,
            customeLogoBranding,
            icon,
            iconColor,
            planPros,
            planCons,
            duration,
            termsAndPolicy,
            adminNotes
        });

        if (!plan) {
            throw new ApiError(500, "Something went wrong while creating plan");
        }

        if (Array.isArray(normalized) && normalized.length > 0) {
          const uniqueModuleIds = [...new Set(normalized.map(n => n.moduleId))];
          const moduleMappings = uniqueModuleIds.map((moduleId) => ({
            planId: plan.id,
            moduleId,
          }));
          console.log("moduleMappings",moduleMappings);
          await PlanModule.bulkCreate(moduleMappings);

          // Store plan-specific submodules in PlanSubModule table
          const subModuleMappings = [];
          const seenSubModules = new Set(); // Track duplicates
          
          for (const item of normalized) {
            const { moduleId, subModules } = item;
            
            // Validate subModule IDs exist and belong to the module
            if (Array.isArray(subModules) && subModules.length > 0) {
              // Check for duplicate submodules in the same request
              const uniqueSubModules = [...new Set(subModules)];
              if (uniqueSubModules.length !== subModules.length) {
                throw new ApiError(400, `Duplicate submodule IDs found in module ${moduleId}`);
              }

              const validSubModules = await SubModule.findAll({
                where: {
                  id: { [Op.in]: subModules },
                  moduleId: moduleId
                }
              });

              if (validSubModules.length !== subModules.length) {
                throw new ApiError(400, `Some submodule IDs are invalid or don't belong to module ${moduleId}`);
              }

              // Add to mappings and check for global duplicates
              for (const subModuleId of subModules) {
                if (seenSubModules.has(subModuleId)) {
                  throw new ApiError(400, `SubModule ID ${subModuleId} is duplicated across multiple modules`);
                }
                seenSubModules.add(subModuleId);
                
                subModuleMappings.push({
                  planId: plan.id,
                  moduleId: moduleId,
                  subModuleId: subModuleId
                });
              }
            }
          }

          if (subModuleMappings.length > 0) {
            await PlanSubModule.bulkCreate(subModuleMappings);
            console.log("subModuleMappings created:", subModuleMappings.length);
          }
        }

        return res.status(201).json(new ApiResponse(201, plan, "Plan created successfully"));
    } catch (error) {
        console.error("Error in createPlan:", error.message);
        throw new ApiError(500, error.message);
    }
})

const getPlan = asynchandler(async (req, res) => {
    try {
        const { Plan, Module, SubModule, PlanSubModule } = req.app.locals.models;
        const sequelize = req.app.locals.sequelize;
        const { active } = req.query; // Get 'active' query parameter
        
        // Build where condition
        let whereCondition = {
            isdeleted: false
        };
        
        // If active=true is passed, filter by status
        if (active === 'true') {
            whereCondition.status = true;
        }
        
        const plans = await Plan.findAll({
            where: whereCondition,
            include: [
                {
                    model: Module,
                    as: 'modules',
                    through: { attributes: [] }, // Exclude join table attributes
                    attributes: ['id', 'name', 'description', 'icon']
                }
            ]
        });

        // Convert plans to plain objects and fetch submodules
        const plansData = [];
        
        for (const plan of plans) {
            const planData = plan.toJSON();
            const planWithSubModules = [];
            
            for (const module of planData.modules) {
                // Get submodules specific to this plan and module - using separate query
                const subModuleRecords = await sequelize.query(
                    `SELECT sm.id, sm.name, sm.price 
                     FROM public.plan_sub_modules psm
                     JOIN public.sub_modules sm ON psm."subModuleId" = sm.id
                     WHERE psm."planId" = :planId AND psm."moduleId" = :moduleId`,
                    {
                        replacements: { planId: planData.id, moduleId: module.id },
                        type: QueryTypes.SELECT
                    }
                );
                
                module.subModules = subModuleRecords || [];
                planWithSubModules.push(module);
            }
            
            // Replace modules with enriched data
            planData.modules = planWithSubModules;
            plansData.push(planData);
        }

        return res.status(200).json(new ApiResponse(200, plansData, "Plans fetched successfully"));
    } catch (error) {
        console.error("Error in getPlan:", error.message);
        throw new ApiError(500, error.message);
    }
})


const updatePlan = asynchandler(async (req, res) => {
    try {
        let {
            name,
            code,
            category,
            status,
            description,
            actualPrice,
            offerPrice,
            billingCycle,
            gst,
            maxStudent,
            maxStaffUser,
            storageLimit,
            minStudentLimit,
            maxStudentLimit,
            perStudentPrice,
            creditCarryForward,
            emailNotification,
            smsAlerts,
            whatsappAlerts,
            customeLogoBranding,
            icon,
            iconColor,
            planPros,
            planCons,
            duration,
            termsAndPolicy,
            adminNotes,
            modules
        } = req.body;

        // Convert planPros and planCons to arrays if they are strings
        if (planPros && typeof planPros === 'string') {
            planPros = planPros.split(',').map(item => item.trim()).filter(item => item);
        }
        if (planCons && typeof planCons === 'string') {
            planCons = planCons.split(',').map(item => item.trim()).filter(item => item);
        }

        const {id} = req.params;

        const { Plan, PlanModule, PlanSubModule, Module, SubModule } = req.app.locals.models;

        const plan = await Plan.findOne({
            where: {
                id: id,
                isdeleted: false
            }
        });
        if (!plan) {
            throw new ApiError(404, "Plan not found or deleted");
        }

        const existing = await Plan.findOne({
            where: {
                [Op.or]: [{ name }, { code }],
                id: { [Op.ne]: id },
                isdeleted: false
            }
        });
        if (existing) { 
            throw new ApiError(400, "Another plan with same name or code already exists");
        }

        let finalPrice = actualPrice || 0;

        // Parse modules incoming (can be stringified)
        let parsedModulesForUpdate = modules;
        if (typeof modules === 'string') {
            try {
                parsedModulesForUpdate = JSON.parse(modules);
            } catch (error) {
                console.log("Failed to parse modules string in update:", error);
            }
        }

        // If parsedModulesForUpdate is a single object, wrap it in an array
        if (parsedModulesForUpdate && typeof parsedModulesForUpdate === 'object' && !Array.isArray(parsedModulesForUpdate)) {
            parsedModulesForUpdate = [parsedModulesForUpdate];
        }

        // Normalize: expect [{ moduleId, subModules: [IDs] }]
        let normalizedUpdate = [];
        if (Array.isArray(parsedModulesForUpdate)) {
          normalizedUpdate = parsedModulesForUpdate
            .filter(it => it && typeof it === 'object' && it.moduleId && Array.isArray(it.subModules))
            .map(it => ({ moduleId: it.moduleId, subModules: it.subModules }));
        }

        // Validate module IDs exist
        if (Array.isArray(normalizedUpdate) && normalizedUpdate.length > 0) {
          const moduleIds = [...new Set(normalizedUpdate.map(n => n.moduleId))];
          const modulesFound = await Module.findAll({ where: { id: { [Op.in]: moduleIds } } });
          if (modulesFound.length !== moduleIds.length) {
            throw new ApiError(400, "Some provided module IDs are invalid");
          }
        }

        // Use actualPrice directly from frontend - no auto calculation
        finalPrice = actualPrice || 0;

        await plan.update({
            name,
            code,
            category,
            status,
            description,
            actualPrice: finalPrice,
            offerPrice,
            billingCycle,
            gst,
            maxStudent,
            maxStaffUser,
            storageLimit,
            minStudentLimit,
            maxStudentLimit,
            perStudentPrice,
            creditCarryForward,
            emailNotification,
            smsAlerts,
            whatsappAlerts,
            customeLogoBranding,
            icon,
            iconColor,
            planPros,
            planCons,
            duration,
            termsAndPolicy,
            adminNotes
        });

        // Only update modules if explicitly provided in request
        if (modules !== undefined) {
            if (Array.isArray(normalizedUpdate) && normalizedUpdate.length > 0) {
                // Remove duplicate validation - already done above at line 256-262
                const uniqueModuleIds = [...new Set(normalizedUpdate.map(n => n.moduleId))];

                // Delete existing module and submodule mappings
                await PlanModule.destroy({ where: { planId: plan.id } });
                await PlanSubModule.destroy({ where: { planId: plan.id } });

                // Create new module mappings
                const moduleMappings = uniqueModuleIds.map(moduleId => ({
                    planId: plan.id,
                    moduleId
                }));

                await PlanModule.bulkCreate(moduleMappings);

                // Store plan-specific submodules in PlanSubModule table
                const subModuleMappings = [];
                const seenSubModules = new Set(); // Track duplicates
                
                for (const item of normalizedUpdate) {
                    const { moduleId, subModules } = item;
                    
                    // Validate subModule IDs exist and belong to the module
                    if (Array.isArray(subModules) && subModules.length > 0) {
                        // Check for duplicate submodules in the same request
                        const uniqueSubModules = [...new Set(subModules)];
                        if (uniqueSubModules.length !== subModules.length) {
                            throw new ApiError(400, `Duplicate submodule IDs found in module ${moduleId}`);
                        }

                        const validSubModules = await SubModule.findAll({
                            where: {
                                id: { [Op.in]: subModules },
                                moduleId: moduleId
                            }
                        });

                        if (validSubModules.length !== subModules.length) {
                            throw new ApiError(400, `Some submodule IDs are invalid or don't belong to module ${moduleId}`);
                        }

                        // Add to mappings and check for global duplicates
                        for (const subModuleId of subModules) {
                            if (seenSubModules.has(subModuleId)) {
                                throw new ApiError(400, `SubModule ID ${subModuleId} is duplicated across multiple modules`);
                            }
                            seenSubModules.add(subModuleId);
                            
                            subModuleMappings.push({
                                planId: plan.id,
                                moduleId: moduleId,
                                subModuleId: subModuleId
                            });
                        }
                    }
                }

                if (subModuleMappings.length > 0) {
                    await PlanSubModule.bulkCreate(subModuleMappings);
                    console.log("subModuleMappings updated:", subModuleMappings.length);
                }
            } else {
                // If empty array or invalid, remove all modules and submodules
                await PlanModule.destroy({ where: { planId: plan.id } });
                await PlanSubModule.destroy({ where: { planId: plan.id } });
            }
        }
        // If modules is undefined, don't touch existing module mappings

        return res.status(200).json(new ApiResponse(200, plan, "Plan updated successfully"));
    } catch (error) {
        console.error("Error in updatePlan:", error.message);
        throw new ApiError(500, error.message);
    }
});

const getPlanById = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { Plan, Module, SubModule, PlanSubModule } = req.app.locals.models;
        const sequelize = req.app.locals.sequelize;

        const plan = await Plan.findOne({
            where: {
                id: id,
                isdeleted: false
            },
            include: [
                {
                    model: Module,
                    as: 'modules',
                    through: { attributes: [] }, // Exclude join table attributes
                    attributes: ['id', 'name', 'description', 'icon']
                }
            ]
        });

        if (!plan) {
            throw new ApiError(404, "Plan not found");
        }

        // Convert plan to plain object first
        const planData = plan.toJSON();
        
        // Fetch plan-specific submodules for each module
        const planWithSubModules = [];
        
        for (const module of planData.modules) {
            // Get submodules specific to this plan and module - using separate query
            const subModuleRecords = await sequelize.query(
                `SELECT sm.id, sm.name, sm.price 
                 FROM public.plan_sub_modules psm
                 JOIN public.sub_modules sm ON psm."subModuleId" = sm.id
                 WHERE psm."planId" = :planId AND psm."moduleId" = :moduleId`,
                {
                    replacements: { planId: planData.id, moduleId: module.id },
                    type: QueryTypes.SELECT
                }
            );
            
            module.subModules = subModuleRecords || [];
            planWithSubModules.push(module);
        }
        
        // Replace modules with enriched data
        planData.modules = planWithSubModules;

        return res.status(200).json(new ApiResponse(200, planData, "Plan fetched successfully"));
    } catch (error) {
        console.error("Error in getPlanById:", error.message);
        throw new ApiError(500, error.message);
    }
});

const deletePlan = asynchandler(async (req, res) => {
    try {
        const {id} = req.params;
        const { Plan, PlanModule, PlanSubModule } = req.app.locals.models;

        const plan = await Plan.findOne({
            where: { 
                id: id,
                isdeleted: false 
            }
        });
        if (!plan) {
            throw new ApiError(404, "Plan not found or already deleted");
        }        

        // Soft delete the plan (PlanModule and PlanSubModule can be cleaned up later or kept for history)
        await plan.update({
            isdeleted: true,
            deletedat: new Date()
        });

        return res.status(200).json(new ApiResponse(200, null, "Plan deleted successfully"));
    } catch (error) {
        console.error("Error in deletePlan:", error.message);
        throw new ApiError(500, error.message);
    }
});

const restorePlan = asynchandler(async (req, res) => {
    try {
        const {id} = req.params;
        const { Plan } = req.app.locals.models;

        const plan = await Plan.findOne({
            where: { 
                id: id,
                isdeleted: true 
            }
        });
        if (!plan) {
            throw new ApiError(404, "Deleted plan not found");
        }        

        // Restore the plan
        await plan.update({
            isdeleted: false,
            deletedat: null
        });

        return res.status(200).json(new ApiResponse(200, plan, "Plan restored successfully"));
    } catch (error) {
        console.error("Error in restorePlan:", error.message);
        throw new ApiError(500, error.message);
    }
});

// Hard delete - Permanent delete
const hardDeletePlan = asynchandler(async (req, res) => {
    try {
        const {id} = req.params;
        const { Plan, PlanModule, PlanSubModule } = req.app.locals.models;

        const plan = await Plan.findOne({
            where: { id: id }
        });
        
        if (!plan) {
            throw new ApiError(404, "Plan not found");
        }

        // Delete associated records first (due to foreign key constraints)
        await PlanSubModule.destroy({ where: { planId: id } });
        await PlanModule.destroy({ where: { planId: id } });
        
        // Permanently delete the plan
        await plan.destroy();

        return res.status(200).json(new ApiResponse(200, null, "Plan permanently deleted"));
    } catch (error) {
        console.error("Error in hardDeletePlan:", error.message);
        throw new ApiError(500, error.message);
    }
});

// Remove specific module from plan
const removeModuleFromPlan = asynchandler(async (req, res) => {
    try {
        const { planId, moduleId } = req.params;
        const { Plan, PlanModule, PlanSubModule, Module } = req.app.locals.models;

        // Check if plan exists
        const plan = await Plan.findOne({
            where: { id: planId, isdeleted: false }
        });
        if (!plan) {
            throw new ApiError(404, "Plan not found");
        }

        // Check if module exists
        const module = await Module.findOne({
            where: { id: moduleId }
        });
        if (!module) {
            throw new ApiError(404, "Module not found");
        }

        // Check if module is associated with this plan
        const planModule = await PlanModule.findOne({
            where: { planId, moduleId }
        });
        if (!planModule) {
            throw new ApiError(404, "Module not associated with this plan");
        }

        // Delete submodule associations first
        await PlanSubModule.destroy({
            where: { planId, moduleId }
        });

        // Delete module association
        await PlanModule.destroy({
            where: { planId, moduleId }
        });

        return res.status(200).json(
            new ApiResponse(200, null, "Module removed from plan successfully")
        );
    } catch (error) {
        console.error("Error in removeModuleFromPlan:", error.message);
        throw new ApiError(500, error.message);
    }
});

export {
    createPlan,
    getPlan,
    getPlanById,
    updatePlan,
    deletePlan,
    restorePlan,
    hardDeletePlan,
    removeModuleFromPlan
}