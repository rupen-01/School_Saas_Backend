import { ApiError } from "../utils/apiError.js";
import asynchandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { gen } from "../utils/genAi.js";
import path from "path";
import fs from "fs";
import { createSchema } from "../utils/createSchema.js";
import { sequelize } from "../config/database.js";
import { loadModelsForSchema } from "../utils/schemaLoader.js";
import { UniqueConstraintError } from "sequelize";

// Helper function to get school include options with plan, modules, and submodules
const getSchoolIncludeOptions = (Plan, Module, SubModule) => ({
  model: Plan,
  as: "plans",
  include: [{
    model: Module,
    as: 'modules',
    through: { attributes: [] },
    include: [{
      model: SubModule,
      as: 'subModules'
    }]
  }]
});

// Unique constraint validation helper
const handleUniqueConstraintError = (error, req) => {
  if (error instanceof UniqueConstraintError) {
    const duplicateFields = [];
    
    error.errors.forEach(err => {
      const field = err.path;
      const value = err.value;
      
      switch (field) {
        case 'slug':
          duplicateFields.push(`School slug '${value}' already exists. Please choose a different unique slug.`);
          break;
        case 'contactNumber':
          duplicateFields.push(`Contact number '${value}' is already registered. Please use a different number.`);
          break;
        case 'alternateNumber':
          duplicateFields.push(`Alternate number '${value}' is already in use. Please use a different number.`);
          break;
        case 'email':
          duplicateFields.push(`School email '${value}' is already registered. Please use a different email address.`);
          break;
        case 'adminEmail':
          duplicateFields.push(`Admin email '${value}' already exists. Please use a different admin email.`);
          break;
        case 'adminMobileNumber':
          duplicateFields.push(`Admin mobile number '${value}' is already registered. Please use a different number.`);
          break;
        default:
          duplicateFields.push(`Field '${field}' with value '${value}' already exists. Please use a different value.`);
      }
    });
    
    const message = duplicateFields.length > 1 
      ? `Multiple duplicate values found:\n${duplicateFields.join('\n')}`
      : duplicateFields[0];
      
    throw new ApiError(400, message);
  }
  throw error;
};

// Pre-validation for unique constraints
const validateUniqueFields = async (req) => {
  const { School, User, SchoolAdmin } = req.app.locals.models;
  const {
    slug,
    contactNumber,
    alternateNumber,
    email,
    adminEmail,
    adminMobileNumber
  } = req.body;
  
  const duplicateErrors = [];
  
  // Check slug
  if (slug) {
    const existingSlug = await School.findOne({ where: { slug } });
    if (existingSlug) {
      duplicateErrors.push(`School slug '${slug}' already exists. Please choose a different unique slug.`);
    }
  }
  
  // Check contact number
  if (contactNumber) {
    const existingContact = await School.findOne({ where: { contactNumber } });
    if (existingContact) {
      duplicateErrors.push(`Contact number '${contactNumber}' is already registered. Please use a different number.`);
    }
  }
  
  // Check alternate number
  if (alternateNumber) {
    const existingAltContact = await School.findOne({ where: { alternateNumber } });
    if (existingAltContact) {
      duplicateErrors.push(`Alternate number '${alternateNumber}' is already in use. Please use a different number.`);
    }
  }
  
  // Check school email
  if (email) {
    const existingSchoolEmail = await School.findOne({ where: { email } });
    if (existingSchoolEmail) {
      duplicateErrors.push(`School email '${email}' is already registered. Please use a different email address.`);
    }
  }
  
  // Check admin email
  if (adminEmail) {
    const existingAdminEmail = await School.findOne({ where: { adminEmail } });
    if (existingAdminEmail) {
      duplicateErrors.push(`Admin email '${adminEmail}' already exists. Please use a different admin email.`);
    }
    
    const existingUserEmail = await User.findOne({ where: { email: adminEmail } });
    if (existingUserEmail) {
      duplicateErrors.push(`User email '${adminEmail}' is already registered. Please use a different email.`);
    }
    
    const existingSchoolAdminEmail = await SchoolAdmin.findOne({ where: { email: adminEmail } });
    if (existingSchoolAdminEmail) {
      duplicateErrors.push(`School admin email '${adminEmail}' is already registered. Please use a different email.`);
    }
  }
  
  // Check admin mobile number
  if (adminMobileNumber) {
    const existingAdminMobile = await School.findOne({ where: { adminMobileNumber } });
    if (existingAdminMobile) {
      duplicateErrors.push(`Admin mobile number '${adminMobileNumber}' is already registered. Please use a different number.`);
    }
  }
  
  if (duplicateErrors.length > 0) {
    const message = duplicateErrors.length > 1 
      ? `Multiple duplicate values found:\n${duplicateErrors.join('\n')}`
      : duplicateErrors[0];
    throw new ApiError(400, message);
  }
};

// Authentication and JWT generation
const generateToken = async(req,userId) =>{
    try{
        const {User} = req.app.locals.models
           const user = await User.findByPk(userId)
           if (!user) throw new ApiError(404,"User not found")

           const accessToken = user.generateAccessToken()
           const refreshToken = user.generateRefreshToken()

           user.refreshToken = refreshToken
           await user.save()
           return {accessToken,refreshToken}
    } catch (error) {
        gen(`error pehchan and uska soulution de sirf 20 to 25 words m : ${error.message}`);
        throw new ApiError(500,error.message)
    }

}

const login = asynchandler(async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const { User, SchoolAdmin, School, Plan, Module, SubModule } = req.app.locals.models;

  const admin = await User.findOne({
    where: {
      email,
      role: 'school-admin'
    }
  });
  console.log(admin);

  if (!admin) {
    throw new ApiError(404, "Admin's email not found");
  }

  const isPasswordCorrect = await admin.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Fetch school details with plan, modules, and submodules
  const schoolAdmin = await SchoolAdmin.findOne({
    where: { user_id: admin.id }
  });

  let school = null;
  if (schoolAdmin) {
    school = await School.findOne({
      where: { id: schoolAdmin.school_id },
      include: getSchoolIncludeOptions(Plan, Module, SubModule)
    });
  }

  const { accessToken, refreshToken } = await generateToken(req, admin.id);

  // Remove sensitive fields from user object before sending response
  const userResponse = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    schemaName: admin.schemaName,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };

  const options = {
    secure: true,
    httpOnly: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: userResponse, school, accessToken, refreshToken },
        "School admin logged in successfully"
      )
    );
});

const getCurrentUser = asynchandler(async(req,res)=>{
    const { SchoolAdmin, School, Plan, Module, SubModule } = req.app.locals.models;
    
    // Fetch school details with plan, modules, and submodules if user is school-admin
    let school = null;
    if (req.user.role === 'school-admin') {
      const schoolAdmin = await SchoolAdmin.findOne({
        where: { user_id: req.user.id }
      });

      if (schoolAdmin) {
        school = await School.findOne({
          where: { id: schoolAdmin.school_id },
          include: getSchoolIncludeOptions(Plan, Module, SubModule)
        });
      }
    }

    return res.status(200).json(
      new ApiResponse(200, { user: req.user, school }, "User fetched successfully")
    );
})

const logout = asynchandler(async (req, res) => {
    const { User } = req.app.locals.models;

    await User.update(
        { refreshToken: null },
        { where: { id: req.user?.id } }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessTokens = asynchandler(async (req, res) => {
    const { User } = req.app.locals.models;
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findByPk(decodedToken?.id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        // Use your existing token generation logic
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed successfully"));

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const requestPasswordReset = asynchandler(async (req, res) => {
    const { User } = req.app.locals.models;
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required for reset password");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new ApiError(404, "User with email not found");
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(201, resetToken, "Password reset email sent"));
});

const resetPassword = asynchandler(async (req, res) => {
    const { User } = req.app.locals.models;
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
 
    const user = await User.findOne({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { [Op.gt]: new Date() }
        }
    });  

    if (!user) {
        throw new ApiError(400, "Invalid or expired token.");
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Password reset successfully."));
});

// School creation
const createSchool = asynchandler(async(req,res)=>{
try {
  const {
    slug,
    institutionName,
    institutionType,
    establishmentYear,
    medium,
    totalStudent,
    contactPersonName,
    contactNumber,
    alternateNumber,
    addressLine1,
    addressLine2,
    email,
    city,
    state,
    pincode,
    country,
    plan,
    smsSenderId,
    whatsappNumber,
    adminName,
    adminEmail,
    adminMobileNumber,
    notes,
    password
  } = req.body;
  
  let {board} = req.body

  const allowedFields = [
    "slug",
    "institutionName",
    "institutionType",
    "board",
    "establishmentYear",
    "medium",
    "totalStudent",
    "contactPersonName",
    "contactNumber",
    "alternateNumber",
    "addressLine1",
    "addressLine2",
    "email",
    "city",
    "state",
    "pincode",
    "country",
    "plan",
    "smsSenderId",
    "whatsappNumber",
    "adminName",
    "adminEmail",
    "adminMobileNumber",
    "notes",
    "password"
  ];
  
  const missingFields = allowedFields.filter(field => !req.body[field]);
  if (missingFields.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`);
  }
  
  const { School, SchoolAdmin, User, Plan } = req.app.locals.models;

  // Validate all unique constraints before creating anything
  await validateUniqueFields(req);
  
    const schoolImageLocalPath = req.files?.schoolImage?.[0]?.path;
    let schoolImageUrl = null;
    if (schoolImageLocalPath) {
      schoolImageUrl = `${req.protocol}://${req.get('host')}/uploads/school/${path.basename(schoolImageLocalPath)}`
      console.log(schoolImageUrl);
    }

    // user creation
    let user;
    user = await User.create({
      email: adminEmail,
      password,
      role: "school-admin",
      schemaName: slug,
    });

    const findPlan = await Plan.findByPk(plan);
    if (!findPlan) {
      throw new ApiError(400, "Invalid plan selected"); 
    }

    if (board) {
    if (typeof board === "string") {
      try {
        board = JSON.parse(board);
      } catch (e) {
        board = board.split(",");
      }
    }

    if (!Array.isArray(board)) {
      board = [board];
    }
  }
  
      // school creation
      const school = await School.create({
      slug,
      institutionName,
      institutionType,
      board,
      establishmentYear,
      medium,
      totalStudent,
      contactPersonName,
      contactNumber,
      alternateNumber,
      addressLine1,
      addressLine2,
      email,
      city,
      state,
      pincode,
      country,
      plan,
      smsSenderId,
      whatsappNumber,
      schoolImage: schoolImageUrl || null,
      adminName,
      adminEmail,
      adminMobileNumber,
      notes,
    });

    if(!school) {
      throw new ApiError(500, "School creation failed");
    }

    await createSchema(sequelize,slug)
    const modelPath = path.resolve("src/model/tenant");
    console.log("model path",modelPath);
    await loadModelsForSchema(sequelize,slug,modelPath)
  
    const schoolAdmin = await SchoolAdmin.create({
      email: adminEmail,
      user_id: user.id,
      school_id: school.id,
    })
  
  return res.status(201).json(
    new ApiResponse(201, {
      school,
      schoolAdmin,
      user
    }, "School created successfully")
  );
} catch (error) {
  gen(`error pehchan and uska soulution de sirf 20 to 25 words m hinglish me : ${error.message}`);
  
  // Handle unique constraint errors with proper messages
  try {
    handleUniqueConstraintError(error, req);
  } catch (validationError) {
    // Cleanup on validation error
    const {User,SchoolAdmin} = req.app.locals.models;
    await User.destroy({
      where: {
        email: req.body.adminEmail
      }
    });
    await SchoolAdmin.destroy({
      where: {
        email: req.body.adminEmail
      }
    });
    if(req.files?.schoolImage?.[0]?.path) {
      const oldImageName = path.basename(req.files?.schoolImage[0]?.path);
      const oldImagePath = path.join("public", "uploads", "school", oldImageName);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error("Failed to delete old image:", err.message);
        }
      }
    }
    throw validationError;
  }
  
  // Cleanup on other errors
  const {User,SchoolAdmin} = req.app.locals.models;
  await User.destroy({
    where: {
      email: req.body.adminEmail
    }
  });
  await SchoolAdmin.destroy({
    where: {
      email: req.body.adminEmail
    }
  });
  if(req.files?.schoolImage?.[0]?.path) {
    const oldImageName = path.basename(req.files?.schoolImage[0]?.path);
    const oldImagePath = path.join("public", "uploads", "school", oldImageName);
    if (fs.existsSync(oldImagePath)) {
      try {
        fs.unlinkSync(oldImagePath);
      } catch (err) {
        console.error("Failed to delete old image:", err.message);
      }
    }
  }
  throw new ApiError(500, error.message);
}

})

const getSchool = asynchandler(async(req,res)=>{
  const {id} = req.params;
  if(!id) {
    throw new ApiError(400, "School ID is required");
  }
  const { School,Plan,Module,SubModule } = req.app.locals.models;

  const school = await School.findOne({
    where:{id},
    include: getSchoolIncludeOptions(Plan, Module, SubModule)
  })

  if (!school) {
    throw new ApiError(404, "School not found with the provided ID");
  }
  
  return res.status(200).json(
    new ApiResponse(200, school, "School retrieved successfully")
  );
})

const getAllSchools = asynchandler(async(req,res)=>{
  const { School,Plan,Module,SubModule } = req.app.locals.models;

  const schools = await School.findAll({
    include: getSchoolIncludeOptions(Plan, Module, SubModule)
  });

  return res.status(200).json(
    new ApiResponse(200, schools, "Schools retrieved successfully")
  );
})

const updateSchoolImage = asynchandler(async (req, res) => {
  const {id} = req.params;
  const { School } = req.app.locals.models;

  const admin = await School.findByPk(id);
  if (!admin) {
    throw new ApiError(404, "School not found");
  }

  const schoolImageLocalPath = req.files?.schoolImage?.[0]?.path;
  if (!schoolImageLocalPath) {
    throw new ApiError(400, "School image is required");
  }

  if(admin.schoolImage){
    const oldImageName = path.basename(admin.schoolImage);
    const oldImagePath = path.join("public", "uploads", "school", oldImageName);
    if (fs.existsSync(oldImagePath)) {
        try {
            fs.unlinkSync(oldImagePath);
        } catch (err) {
            console.error("Failed to delete old image:", err.message);
        }
    }
  }

  const schoolImageUrl = `${req.protocol}://${req.get("host")}/uploads/school/${path.basename(schoolImageLocalPath)}`;
  await admin.update({ schoolImage: schoolImageUrl });

  return res.status(200).json(
    new ApiResponse(200,schoolImageUrl, "School image updated successfully"))
})

const updateSchool = asynchandler(async (req, res) => {
  const { id } = req.params;
  const {
    institutionName,
    institutionType,
    board,
    establishmentYear,
    medium,
    totalStudent,
    contactPersonName,
    contactNumber,
    alternateNumber,
    addressLine1,
    addressLine2,
    email,
    city,
    state,
    pincode,
    country,
    plan,
    smsSenderId,
    whatsappNumber,
    adminName,
    adminEmail,
    adminMobileNumber,
    notes
  } = req.body;

  const { School, Plan,SchoolAdmin,User } = req.app.locals.models;

  const school = await School.findByPk(id);
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  if (plan) {
    const planExists = await Plan.findByPk(plan);
    if (!planExists) {
      throw new ApiError(400, "Invalid plan selected");
    }
  }

  await school.update({
    institutionName,
    institutionType,
    board,
    establishmentYear,
    medium,
    totalStudent,
    contactPersonName,
    contactNumber,
    alternateNumber,
    addressLine1,
    addressLine2,
    email,
    city,
    state,
    pincode,
    country,
    plan,
    smsSenderId,
    whatsappNumber,
    adminName,
    adminEmail,
    adminMobileNumber,
    notes,
  });

  if(!school){
    throw new ApiError(500, "School update failed");
  }

  if(adminEmail)
  {
    const schoolAdmin = await SchoolAdmin.findOne({where:{school_id:id}});
    console.log(schoolAdmin);
    if(schoolAdmin){
      await schoolAdmin.update({email: adminEmail})
      const user = await User.findByPk(schoolAdmin.user_id)
      console.log(user);
      if(user){
        await user.update({email: adminEmail})
      }
    }
  }

  return res.status(200).json(
    new ApiResponse(200, school, "School updated successfully")
  );
});

const deleteSchool = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { sequelize, School, SchoolAdmin, User } = req.app.locals.models;

  const school = await School.findByPk(id);
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const schemaName = school.slug;

  const schoolAdmin = await SchoolAdmin.findOne({where: { school_id: id }});
    if (schoolAdmin) {
    const user = await User.findOne({ where: { id: schoolAdmin.user_id } });
    if (user) {
      await user.destroy();
    }

    await schoolAdmin.destroy(); 
  }

  try {
    await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
  } catch (error) {
    console.error("Error dropping schema:", error);
    return res.status(500).json({ message: "Failed to drop schema", error });
  }

  if(school.schoolImage) {
    const oldImageName = path.basename(school.schoolImage);
    const oldImagePath = path.join("public", "uploads", "school", oldImageName);
    if (fs.existsSync(oldImagePath)) {
      try {
        fs.unlinkSync(oldImagePath);
      } catch (err) {
        console.error("Failed to delete old image:", err.message);
      }
    }
  }
  
  await school.destroy();
  return res.status(200).json(
    new ApiResponse(200, null, `School '${school.institutionName}' and its related data deleted successfully`)
  );
});

export {
  login,
  getCurrentUser,
  logout,
  refreshAccessTokens,
  requestPasswordReset,
  resetPassword,
  createSchool,
  getSchool,
  getAllSchools,
  updateSchoolImage,
  updateSchool,
  deleteSchool
}

