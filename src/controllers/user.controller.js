const bcrypt = require("bcryptjs");
const UserModel = require("../models/user.model");
const RoleModel = require("../models/role.model");

class UserController {
  static async create(req, res) {
    try {
      const { name, email, username,password, role_name, organization_id } = req.body;
      if(!email && !username) {
        return res.status(400).json({
          error: "Either email or username is required",
        });
      }
      let finalUsername;
      if(username && username.trim()){
        const normalizedUsername = username.toLowerCase();
        
        const existingUser = await UserModel.getByUsername(normalizedUsername);
        if (existingUser) {
          return res.status(400).json({ error: "Username already exists" });
        }
        finalUsername=normalizedUsername;        
      }else{
        finalUsername=await UserModel.generateUsername();;
      }

      if (email) {
        const existingEmail = await UserModel.getByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const orgId =
        req.user.role === "org_admin"
          ? req.user.organization_id
          : organization_id;
       
      const role = await RoleModel.getByName(role_name);

      if (!role) {
        return res.status(400).json({ error: "Invalid role" });
      }

      if (req.user.role === "org_admin" && role_name !== "user") {
        return res
          .status(403)
          .json({ error: "Org admin can only create users" });
      }

      const id = await UserModel.create({
        name,
        email,
        username: finalUsername,
        password: hashedPassword,
        role_id: role._id,
        organization_id: orgId,
      });

      return res.status(201).json({ id });
    } catch (err) {
      console.error("User Create Error:", err);
      return res.status(500).json({ error: "Failed to create user" });
    }
  }

  static async getAll(req, res) {
    try {
      const { page, limit } = req.query;

      const orgId =
        req.user.role === "org_admin"
          ? req.user.organization_id
          : req.query.organization_id;

      const result = await UserModel.getAll({
        organization_id: orgId,
        page: Number(page),
        limit: Number(limit),
      });

      return res.json(result);
    } catch (err) {
      console.error("User GetAll Error:", err);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  static async update(req, res) {
    try {
      const user = await UserModel.getById(req.params.id);

      if (
        req.user.role === "org_admin" &&
        String(user.organization_id) !== String(req.user.organization_id)
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      await UserModel.update(req.params.id, req.body);
      return res.json({ success: true });
    } catch (err) {
      console.error("User Update Error:", err);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  static async delete(req, res) {
    try {
      const user = await UserModel.getById(req.params.id);

      if (
        req.user.role === "org_admin" &&
        String(user.organization_id) !== String(req.user.organization_id)
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      await UserModel.delete(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error("User Delete Error:", err);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  }
}

module.exports = UserController;
