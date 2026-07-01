import { DataTypes } from "sequelize";

export default (sequelize) => {
    const SchoolModule = sequelize.define('SchoolModule', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        schoolId: {
            type: DataTypes.UUID,
            references: {
                model: 'schools',
                key: 'id'
            },
            allowNull: false
        },
        moduleId: {
            type: DataTypes.UUID,
            references: {
                model: 'modules',
                key: 'id'
            },
            allowNull: false
        }
    }, {
        tableName: 'school_modules',
        schema: 'public',
        timestamps: true // Optional: if you want to track when a module was assigned
    });

    return SchoolModule;
};