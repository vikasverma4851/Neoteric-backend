const express = require("express");
const router = express.Router();
const {
    getProjects,createProject,updateProject,deleteProject
 
} = require("../controllers/projectController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

// Routes
router.get('/',protect, getProjects);
router.post('/',protect,createProject);
router.put('/:id',protect,updateProject);
router.delete('/:id',protect, deleteProject);

module.exports = router;
