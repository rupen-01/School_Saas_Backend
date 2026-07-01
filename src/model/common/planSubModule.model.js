import { DataTypes } from "sequelize"

export default (sequelize) => {
    const PlanSubModule = sequelize.define(
        "PlanSubModule",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },
            planId: {
                type: DataTypes.UUID,
                references: {
                    model: "plans",
                    key: "id"
                },
                allowNull: false,
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            moduleId: {
                type: DataTypes.UUID,
                references: {
                    model: 'modules',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            subModuleId: {
                type: DataTypes.UUID,
                references: {
                    model: 'sub_modules',
                    key: 'id'
                },
                allowNull: false,
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        },
        {
            tableName: "plan_sub_modules",
            schema: "public",
            timestamps: true,
            indexes: [
                {
                    name: "uniq_plan_module_submodule",
                    unique: true,
                    fields: ["planId", "moduleId", "subModuleId"]
                }
            ]
        }
    )
    return PlanSubModule
}

