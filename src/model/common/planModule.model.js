import { DataTypes } from "sequelize"

export default (sequelize)=>{
    const PlanModule = sequelize.define(
        "PlanModule",
        {
            planId:{
                type:DataTypes.UUID,
                references:{
                    model:"plans",
                    key:"id"
                },
                allowNull:false
            },
             moduleId:{
                type: DataTypes.UUID,
                references: {
                    model: 'modules',
                    key: 'id'
                },
            allowNull: false
        }
        },
        {
            tableName:"plan_modules",
            schema:"public",
            timestamps:true
        }
    )
     return PlanModule
}