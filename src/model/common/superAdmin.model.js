import { DataTypes } from "sequelize"

export default (sequelize,schema) => {
 const SuperAdmin = sequelize.define(
    "SuperAdmin",
    {
        id:{type:DataTypes.UUID,primaryKey: true, defaultValue:DataTypes.UUIDV4 },
        adminImage:DataTypes.STRING,
        fullName:DataTypes.STRING,
        email:{type:DataTypes.STRING,unique:true},
        mobileNumber:{type:DataTypes.BIGINT,unique:true,allowNull:true},
        role:{type:DataTypes.ENUM("super-admin","technical-admin","support-agent","sales")},
        rolePermission:{type:DataTypes.STRING},
        status:{type:DataTypes.BOOLEAN},
        notes:{type:DataTypes.STRING}
    },
    {
        schema,
        tableName:"super_admin",
        timestamps:true
    }
)
    return SuperAdmin
}