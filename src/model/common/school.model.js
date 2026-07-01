import { DataTypes } from "sequelize"

export default (sequelize) =>{
    const School = sequelize.define('School', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue:DataTypes.UUIDV4
      },
      slug: {
        type: DataTypes.STRING, 
        unique: true, 
        allowNull: false 
      },
      institutionName: {
        type: DataTypes.STRING, 
        allowNull: false 
      },
      institutionType:{
        type:DataTypes.ENUM("School","College","Coaching","Other"),
        allowNull:false
      },
      board:{
        type:DataTypes.ARRAY(DataTypes.ENUM("CBSE","ICSE","State-Board","IB")),
        allowNull:false
      },
      establishmentYear:DataTypes.BIGINT,
      medium:{
        type:DataTypes.ENUM("English","Hindi","Bilingual")
      },
      totalStudent:DataTypes.BIGINT,

      // contact fields
      contactPersonName:{
        type:DataTypes.STRING,
        allowNull:false
      },
      contactNumber:{
        type:DataTypes.BIGINT,
        unique:true,
        allowNull:false
      },
      alternateNumber:{
        type:DataTypes.BIGINT,
        unique:true
      },
      addressLine1:{
        type:DataTypes.STRING
      },
      addressLine2:{
        type:DataTypes.STRING
      },
      email:{
        type:DataTypes.STRING,
        unique:true
      },
      city:{
        type:DataTypes.STRING,
        allowNull:false
      },
      state:{
        type:DataTypes.STRING,
        allowNull:false
      },
      pincode:{
        type:DataTypes.BIGINT,
        allowNull:false
      },
      country:{
        type:DataTypes.STRING,
        allowNull:false
      },

      // Technical fields
      plan:{
        type:DataTypes.UUID,
        references: {
          model: 'plans',
          key: 'id'
        },
        allowNull: false
      },
      smsSenderId:{
        type:DataTypes.STRING,
        allowNull:false
      },
      whatsappNumber:{
        type:DataTypes.BIGINT,
        allowNull:false
      },
      schoolImage:{
        type:DataTypes.STRING,
        allowNull:true
      },
      
      // Admin creation fields
      adminName:{
        type:DataTypes.STRING,
        allowNull:false
      },
      adminEmail:{
        type:DataTypes.STRING,
        unique:true,
        allowNull:false
      },
      adminMobileNumber:{
        type:DataTypes.BIGINT,
        unique:true,
        allowNull:false
      },
      // Notes
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isPaymentDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
  
    }, {
      tableName: 'schools',
      schema: 'public',
      timestamps: false
    })

    return School
} 