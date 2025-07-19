const Project = require('../models/Project');

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

// Create a project
exports.createProject = async (req, res) => {
  try {
    const { name, projectType } = req.body;
    if (!name || !projectType) {
      return res.status(400).json({ message: 'Project Name and Project Type are required' });
    }
    const project = new Project({ name, projectType });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create project' });
  }
};

// Update a project
exports.updateProject = async (req, res) => {
  try {
    const { name, projectType } = req.body;
    if (!name || !projectType) {
      return res.status(400).json({ message: 'Project Name and Project Type are required' });
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, projectType, createdAt: new Date() },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project' });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};