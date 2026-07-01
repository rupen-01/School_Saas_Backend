import { DataTypes } from "sequelize";

export default (sequelize) => {
    const Plan = sequelize.define('Plan', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },

        // Basic plan 
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        code:{
            type:DataTypes.STRING,
            allowNull:false,
            unique:true
        },
        category:{
            type:DataTypes.ENUM("Flexible","Fixed"),
            allowNull:false
        },
        status:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },
        description:{
            type:DataTypes.STRING,
            allowNull:false
        },

        // pricing
        actualPrice:{
            type:DataTypes.BIGINT,
            allowNull:false
        },
        offerPrice:{
            type:DataTypes.BIGINT,
            allowNull:false
        },
        billingCycle:{
            type:DataTypes.ENUM("monthly","quarterly","annually"),
            allowNull:false
        },
        gst:{
            type:DataTypes.BIGINT
        },

        // Fixed plan details
        maxStudent:{
            type:DataTypes.BIGINT
        },
        maxStaffUser:{
            type:DataTypes.BIGINT
        },
        storageLimit:{
            type:DataTypes.BIGINT
        },

        // Flexible Plan Details
        minStudentLimit: {
          type: DataTypes.BIGINT
        },
        maxStudentLimit: {
          type: DataTypes.BIGINT
        },
        perStudentPrice: {
          type: DataTypes.BIGINT
        },
        creditCarryForward: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },

        // notification branding
        emailNotification:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },
        smsAlerts:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },
        whatsappAlerts:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },
        customeLogoBranding:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },

        // Visual Fields
        icon: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        iconColor: {
          type: DataTypes.STRING,
          allowNull: true,
        },
  
        // Plan Pros & Cons
        planPros: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        planCons: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },

        // Notes & Controlls
        duration:{
            type:DataTypes.ENUM("7days","30days","90days","1year")
        },
        termsAndPolicy:{
            type:DataTypes.STRING,
            allowNull:false
        },
        adminNotes:{
            type:DataTypes.STRING,
            allowNull:false
        }
    }, {
        tableName: 'plans',
        schema: 'public',
        timestamps: false
    });

    return Plan;
}; 