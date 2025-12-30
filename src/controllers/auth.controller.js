const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
// const { ObjectId } = require("mongodb");
const UserModel = require("../models/user.model");
const RoleModel = require("../models/role.model");

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res
        .status(400)
        .json({ message: "Email or username and password required" });
    }

    let user = null;

    if (email) {
      user = await UserModel.getByEmail(email.toLowerCase());
    } else if (username) {
      user = await UserModel.getByUsername(username.toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = await RoleModel.getById(user.role_id);

    if (!role) {
      return res.status(500).json({ message: "Associated role not found" });
    }

    const token = generateToken({
      user_id: user._id.toString(),
      role: role.role_name,
      organization_id: user.organization_id
        ? user.organization_id.toString()
        : null,
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: role.role_name,
        organization_id: user.organization_id,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.signup = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const existingEmailUser = await UserModel.getByEmail(email.toLowerCase());
    if (existingEmailUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    let finalUsername;
    if (username && username.trim()) {
      const normalizedUsername = username.toLowerCase();
      const existingUsernameUser = await UserModel.getByUsername(
        normalizedUsername
      );
      if (existingUsernameUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      finalUsername = normalizedUsername;
    } else {
      finalUsername = await UserModel.generateUsername();
    }

    const role = await RoleModel.getByName("individual");

    if (!role) {
      return res.status(500).json({ message: "Individual role not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userId = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      password: hashedPassword,
      role_id: role._id,
      organization_id: null,
    });

    res.status(201).json({
      message: "Signup successful",
      user_id: userId,
      username: finalUsername,
      email: email.toLowerCase(),
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
};
