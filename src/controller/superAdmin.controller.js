import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asynchandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { Op, where } from "sequelize";
import crypto, { hash } from "crypto";
import { gen } from "../utils/genAi.js";
import path  from "path";
import fs from "fs"

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
        try {
            gen(`error pehchan and uska soulution de sirf 20 to 25 words m : ${error.message}`);
        } catch (aiError) {
            console.error("GenAI Error:", aiError.message);
        }
        throw new ApiError(500,error.message)
    }

}

const createSuperAdmin = asynchandler(async (req, res) => {
    const sequelize = req.app.locals.sequelize;
    const { email, fullName, mobileNumber, password, role, rolePermission, status, notes } = req.body;
    const { SuperAdmin, User } = req.app.locals.models;

    // 1. Validation logic fix: don't use .trim() on non-string fields
    const requiredFields = ["email", "fullName", "password", "role"];
    const missingFields = requiredFields.filter(field => !req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim()));

    if (missingFields.length > 0) {
        throw new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`);
    }

    // 2. Check existence before starting transaction
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new ApiError(409, "User already exists with this email");
    }

    const adminImageLocalImage = req.files?.adminImage?.[0]?.path;
    let adminImageUrl = "";
    if (adminImageLocalImage) {
        adminImageUrl = `${req.protocol}://${req.get('host')}/uploads/admin/${path.basename(adminImageLocalImage)}`;
    }

    // 3. Use Transaction for atomic operations
    const t = await sequelize.transaction();

    try {
        const user = await User.create({
            email,
            password,
            role
        }, {
            transaction: t,
            skipPasswordHistory: true // Explicitly skip history for new registration
        });

        const admin = await SuperAdmin.create({
            email,
            fullName,
            mobileNumber,
            role,
            rolePermission,
            status: status === "active" || status === true || status === "true",
            notes,
            adminImage: adminImageUrl
        }, { transaction: t });

        await t.commit();

        return res
            .status(201)
            .json(new ApiResponse(201, { user, admin }, "Admin created successfully"));

    } catch (error) {
        await t.rollback();

        // Non-blocking AI error analysis
        gen(`error pehchan and uska soulution de sirf 20 to 25 words m : ${error.message}`).catch(() => {});

        // Cleanup uploaded file on failure
        if (adminImageLocalImage && fs.existsSync(adminImageLocalImage)) {
            try {
                fs.unlinkSync(adminImageLocalImage);
            } catch (err) {
                console.error("Failed to delete uploaded image on error:", err.message);
            }
        }

        throw new ApiError(500, error.message || "Internal Server Error");
    }
});

const login = asynchandler(async(req,res)=>{
    const {email,password,role} = req.body

    const allowedFields = ["email","password","role"]
    const missingFields = allowedFields.filter(field=> !req.body[field])
    if(missingFields.length > 0){
        throw new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`);
    }


    const {User} = req.app.locals.models

    const admin = await User.findOne({where:{email:email,role:role}})
    if(!admin)
    {
        throw new ApiError(404,"Admin not found for this role")
    }

    const isPasswordCorrect = await admin.isPasswordCorrect(password)
    if(!isPasswordCorrect)
    {
        throw new ApiError(404,"Invalid Credential")
    }

    const {accessToken,refreshToken} = await generateToken(req,admin.id)

    const loggedInUser = await User.findByPk(admin.id)

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
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
})

const updateAdminImage = asynchandler(async (req, res) => {
  const {id} = req.params;
  const { SuperAdmin } = req.app.locals.models;

  const admin = await SuperAdmin.findByPk(id);
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const adminImageLocalPath = req.files?.adminImage?.[0]?.path;
  if (!adminImageLocalPath) {
    throw new ApiError(400, "Admin image is required");
  }

  if(admin.adminImage){
    const oldImageName = path.basename(admin.adminImage);
    const oldImagePath = path.join("public", "uploads", "admin", oldImageName);
    if (fs.existsSync(oldImagePath)) {
        try {
            fs.unlinkSync(oldImagePath);
        } catch (err) {
            console.error("Failed to delete old image:", err.message);
        }
    }
  }

  const adminImageUrl = `${req.protocol}://${req.get("host")}/uploads/admin/${path.basename(adminImageLocalPath)}`;
  await admin.update({ adminImage: adminImageUrl });

  return res.status(200).json(
    new ApiResponse(200 ,adminImageUrl, "Admin image updated successfully"))
})

const filterSuperAdmins = asynchandler(async (req, res) => {
const { search, status, page = 1, limit = 10 } = req.query;

    const whereCondition = {};

    if (search && search.trim().length >= 3) {
        whereCondition.fullName = { [Op.iLike]: `%${search.trim()}%` };
    }
    else{
         return res.status(200).json(
        new ApiResponse(200, {
        }, "Filtered SuperAdmins fetched successfully")
    );
    }

    if (status) {
        if (status.toLowerCase() === "active") {
            whereCondition.status = true;
        } else if (status.toLowerCase() === "inactive") {
            whereCondition.status = false;
        }
    }

    const offset = (page - 1) * limit;
    const { rows, count } = await req.app.locals.models.SuperAdmin.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]]
    });

    const totalUsers = await req.app.locals.models.SuperAdmin.count();
    const activeUsers = await req.app.locals.models.SuperAdmin.count({ where: { status: true } });
    const inactiveUsers = await req.app.locals.models.SuperAdmin.count({ where: { status: false } });

    return res.status(200).json(
        new ApiResponse(200, {
            stats: {
                totalUsers,
                activeUsers,
                inactiveUsers
            },
            pagination: {
                totalRecords: count,
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit)
            },
            data: rows
        }, "Filtered SuperAdmins fetched successfully")
    );
});

const getAllSchools = asynchandler(async (req, res) => {
  const { School,Plan } = req.app.locals.models;

  const schools = await School.findAll({
    include: {
      model: Plan,
      as: "plans"
    }
  });

  return res.status(200).json(
    new ApiResponse({
      message: "Schools retrieved successfully",
      data: schools
    })
  );
});

const getCurrentUser = asynchandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"User fetched successfully"))
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

const deleteAdmin = asynchandler(async(req,res)=>{
    const {id} = req.params;

    const {SuperAdmin,User} = req.app.locals.models

    const admin = await SuperAdmin.findByPk(id)
    if(admin)
    {
       const user = await User.findOne({where:{email:admin.email}})
       if(user)
       {
        await user.destroy()
       }
    }

    if(admin.adminImage)
    {
        const oldImageName = path.basename(admin.adminImage);
            const oldImagePath = path.join("public", "uploads", "admin", oldImageName);
            if (fs.existsSync(oldImagePath)) {
              try {
                fs.unlinkSync(oldImagePath);
              } catch (err) {
                console.error("Failed to delete old image:", err.message);
              }
        }
    }

    await admin.destroy()
    return res.status(200).json(
    new ApiResponse(200,{},"Admin deleted successfully")
  );

})

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

const findAllModule = asynchandler(async(req,res)=>{
    const {Module} = req.app.locals.models;

    const modules = await Module.findAll()
    if(!modules || modules.length === 0)
    {
        throw new ApiError(404,"Modules not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,modules,"Modules fetched successfully"))

})

const assignModulesToSchool = asynchandler(async (req, res) => {
    const { schoolId, moduleIds } = req.body;

    if (!schoolId || !moduleIds || !Array.isArray(moduleIds)) {
        throw new ApiError(400, "School ID and an array of Module IDs are required.");
    }

    const { School, Module } = req.app.locals.models;

    const school = await School.findByPk(schoolId);
    if (!school) {
        throw new ApiError(404, "School not found.");
    }

    const modules = await Module.findAll({
        where: {
            id: moduleIds
        }
    });

    if (modules.length !== moduleIds.length) {
        throw new ApiError(404, "One or more modules not found.");
    }

    await school.setModules(modules);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Modules assigned to school successfully."));
});

export{
    createSuperAdmin,
    login,
    deleteAdmin,
    filterSuperAdmins,
    updateAdminImage,
    getAllSchools,
    getCurrentUser,
    refreshAccessTokens,
    requestPasswordReset,
    resetPassword,
    logout,
    findAllModule,
    assignModulesToSchool
}