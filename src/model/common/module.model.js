import { DataTypes } from "sequelize";

export default (sequelize) => {
    const Module = sequelize.define('Module', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        totalPrice: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        description: {
            type: DataTypes.TEXT
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Icon URL or emoji for the module'
        }
    }, {
        tableName: 'modules',
        schema: 'public',
        timestamps: false
    });

    return Module;
};