const User = require("../models/user");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const jimp = require("jimp");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sgMail = require("@sendgrid/mail");

require("dotenv").config();
const secret = process.env.SECRET;

const sendVerificationEmail = (email, verificationToken) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email, // Change to your recipient
    from: "krogul.skim.mk@gmail.com", // Change to your verified sender
    subject: "Verification email",
    text: "and easy to do anywhere, even with Node.js",
    html: `To verify in our database please click this link <a href="http://localhost:3000/api/users/verify/${verificationToken}">http://localhost:3000/api/users/verify/${verificationToken}</a>`,
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log(`Email sent to mail: ${email}`);
    })
    .catch((error) => {
      console.error(error);
    });
};

const userLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.validPassword(password)) {
      return res.json({
        status: "error",
        code: 400,
        data: "Bad request",
        message: "Incorrect login/password",
      });
    }

    if (!user.verify) {
      return res.json({
        status: "error",
        code: 400,
        data: "Bad request",
        message: "User not verified!",
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      password: user.password,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    const decoded = jwt.verify(token, secret);
    console.log(decoded);

    user.token = token;
    await user.save();

    res.json({
      status: "succes",
      code: 200,
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

const userRegister = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      res.json({
        status: "error",
        code: 409,
        data: "Conflict",
        message: "User already exist!",
      });
    }
    const avatarURL = gravatar.url(email, { s: "200", r: "pg", d: "mm" });

    const verificationToken = uuidv4();
    const newUser = new User({ email, avatarURL, verificationToken });

    // add second validation becouse password validation is not working in user schema
    /*     const isPasswordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password);
    if (!isPasswordValid) {
      res.json({
        status: "error",
        code: 400,
        data: "Bad Request",
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
      });
      return; // Return early to prevent further execution
    }
 */
    newUser.setPassword(password);

    await newUser.save();

    // verification email

    sendVerificationEmail(email, verificationToken);

    res.json({
      status: "success",
      code: 201,
      user: {
        email: email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const userLogout = async (req, res, next) => {
  try {
    const token = req.headers.authorization.slice(7);
    const user = await User.findOne({ token });

    user.token = null;
    await user.save();
    res.json({
      status: "success",
      code: 200,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const userCurrent = async (req, res, next) => {
  try {
    const token = req.headers.authorization.slice(7);
    const user = await User.findOne({ token });

    res.json({
      status: "ok",
      code: 200,
      message: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const userSubscription = async (req, res, next) => {
  try {
    const token = req.headers.authorization.slice(7);
    const user = await User.findOne({ token });

    const { subscription } = req.body;

    const validSubscriptions = ["starter", "pro", "business"];
    if (!validSubscriptions.includes(subscription)) {
      return res.status(400).json({
        status: "Bad Request",
        code: 400,
        message: "Invalid subscription value",
      });
    }

    user.subscription = subscription;
    await user.save();

    res.json({
      status: "success",
      code: 200,
      message: "Subscription updated successfully",
      data: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const userAvatar = async (req, res, next) => {
  try {
    const token = req.headers.authorization.slice(7);
    const user = await User.findOne({ token });

    const { file } = req;
    console.log(file);

    const image = await jimp.read(file.path);
    await image.cover(250, 250).write(`./public/avatars/${file.filename}`);
    const avatarURL = `/avatars/${file.filename}`;

    user.avatarURL = avatarURL;
    await user.save();

    res.json({
      status: "ok",
      code: 200,
      data: {
        avatarURL: avatarURL,
      },
    });
  } catch (error) {
    next(error);
  }
};

const userVerification = async (req, res, next) => {
  try {
    const verificationToken = req.params.verificationToken;
    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.json({
        status: "Not Found",
        code: 404,
        ResponseBody: {
          message: "User not found",
        },
      });
    }

    user.verificationToken = "null";
    user.verify = true;
    await user.save();

    res.json({
      status: "ok",
      code: 200,
      ResponseBody: {
        message: "Verification successful",
      },
    });
  } catch (error) {
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing required field email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    const newVerificationToken = uuidv4();

    user.verificationToken = newVerificationToken;
    await user.save();

    sendVerificationEmail(email, newVerificationToken);

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  userLogin,
  userRegister,
  userLogout,
  userCurrent,
  userSubscription,
  userAvatar,
  userVerification,
  resendVerificationEmail,
};
