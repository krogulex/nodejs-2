const express = require("express");
const router = express.Router();

const auth = require("../../config/authorization");

const multer = require("multer")
const path = require("path");
const fs = require("fs/promises");
const storeAvatar = path.join(process.cwd(), "tmp");

const storage = multer.diskStorage({
  destination: "./tmp",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});
const upload = multer({ storage });

const {
  userLogin,
  userRegister,
  userLogout,
  userCurrent,
  userSubscription,
  userAvatar
} = require("../../controller/usersCtrl");

router.post("/login", userLogin);

router.post("/register", userRegister);

router.get("/logout", auth, userLogout);

router.get("/current", auth, userCurrent);

router.patch("/", auth, userSubscription);

router.patch("/avatars", auth, upload.single("avatar"), userAvatar);

module.exports = router;
