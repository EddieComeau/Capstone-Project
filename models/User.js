// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    favoriteMatchupIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Matchup",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
