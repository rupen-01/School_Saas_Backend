import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "schoolImage") {
            cb(null, "./public/uploads/school");
        } else if (file.fieldname === "adminImage") {
            cb(null, "./public/uploads/admin");
        } else if (file.fieldname === "teacherImage") {
            cb(null, "./public/uploads/teacher");
        } else if (file.fieldname === "studentImage") {
            cb(null, "./public/uploads/student");
        } else {
            cb(new Error("Invalid field name!"), false);
        }
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.fieldname}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed!"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export default upload;
