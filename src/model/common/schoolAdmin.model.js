import { DataTypes } from "sequelize"


export default (sequelize,schema) =>{
    const SchoolAdmin = sequelize.define(
        'SchoolAdmin',
        {
           id: { type: DataTypes.UUID, primaryKey: true, defaultValue:DataTypes.UUIDV4 },
           email:{type:DataTypes.STRING,unique:true},
           user_id: { type: DataTypes.UUID, allowNull: false },
           school_id: { type: DataTypes.UUID, allowNull: false }
        }, {
          tableName: 'school_admins',
          schema,
          timestamps: false
        })

    return SchoolAdmin
}