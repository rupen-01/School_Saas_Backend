import { DataTypes } from "sequelize"

export default (sequelize, schema) => {
    const Student = sequelize.define(
        "Student",
        {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            fullName: { type: DataTypes.STRING, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: false, unique: true },
            rollNumber: { type: DataTypes.STRING, allowNull: false, unique: true }
        },
        {
            schema,
            tableName: "students",
            timestamps: true
        }
    );
    return Student;
} 