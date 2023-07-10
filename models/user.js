const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bCrypt = require("bcryptjs");

const user = new Schema({
  password: {
    type: String,
    required: [true, 'Password is required'],
    validate: {
        validator: function (value) {
          // Password must contain at least one uppercase letter, one lowercase letter, and one digit
          const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
          return passwordRegex.test(value);
        },
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
      }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    minlength: [3, "Email must have at least 3 characters"],
    maxlength: [170, "Email can have at most 170 characters"],
    validate: {
        validator: function (value) {
          const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
          return emailRegex.test(value);
        },
        message: "Email must be a valid email address"
      }
  },
  subscription: {
    type: String,
    enum: ["starter", "pro", "business"],
    default: "starter"
  },
  token: {
    type: String,
    default: null,
  },
  avatarURL: String
});

 user.methods.setPassword = function (password) {
  this.password = bCrypt.hashSync(password, bCrypt.genSaltSync(6));
};

user.methods.validPassword = function (password) {
  return bCrypt.compareSync(password, this.password);
}; 

const User = mongoose.model("user", user);

module.exports = User;
