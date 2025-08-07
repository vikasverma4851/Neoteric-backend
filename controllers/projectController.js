
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
    const {
      name,
      projectTypes,
      address,
      developer,
      maintenanceAgency,
      reraNos,
      offerOfPossession,
      constructionCompletionCommitment,
      delayCompensation,
      delayPenalty,
      maintenanceStartDate,
      possessionConditions,
    } = req.body;

    // console.log('Request body:', req.body);

    if (!name || !projectTypes || !Array.isArray(projectTypes) || projectTypes.length === 0) {
      return res.status(400).json({ message: 'Project Name and at least one Project Type are required' });
    }

    const project = new Project({
      name:name?.trim(),
      projectTypes,
      address: address || '',
      developer: developer || '',
      maintenanceAgency: maintenanceAgency || '',
      reraNos: reraNos || '',
      offerOfPossession: offerOfPossession || null,
      constructionCompletionCommitment: constructionCompletionCommitment || '',
      delayCompensation: delayCompensation || '',
      delayPenalty: delayPenalty || '',
      maintenanceStartDate: maintenanceStartDate || null,
      possessionConditions: possessionConditions || '',
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

// Update a project
exports.updateProject = async (req, res) => {
  try {
    const {
      name,
      projectTypes,
      address,
      developer,
      maintenanceAgency,
      reraNos,
      offerOfPossession,
      constructionCompletionCommitment,
      delayCompensation,
      delayPenalty,
      maintenanceStartDate,
      possessionConditions,
    } = req.body;

    if (!name || !projectTypes || !Array.isArray(projectTypes) || projectTypes.length === 0) {
      return res.status(400).json({ message: 'Project Name and at least one Project Type are required' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        projectTypes,
        address: address || '',
        developer: developer || '',
        maintenanceAgency: maintenanceAgency || '',
        reraNos: reraNos || '',
        offerOfPossession: offerOfPossession || null,
        constructionCompletionCommitment: constructionCompletionCommitment || '',
        delayCompensation: delayCompensation || '',
        delayPenalty: delayPenalty || '',
        maintenanceStartDate: maintenanceStartDate || null,
        possessionConditions: possessionConditions || '',
        updatedAt: new Date(), // Update timestamp manually since timestamps: true handles createdAt/updatedAt
      },
      { new: true }
    );

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error updating project:', err);
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
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};















// const Project = require('../models/Project');

// // Get all projects
// exports.getProjects = async (req, res) => {
//   try {
//     const projects = await Project.find();
//     res.json(projects);
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to fetch projects' });
//   }
// };

// // Create a project
// exports.createProject = async (req, res) => {
//   try {
//     const { name, projectTypes, address } = req.body;

//   console.log('testing',name, projectTypes, address);
  
//     if (!name || !projectTypes || !Array.isArray(projectTypes) || projectTypes.length === 0) {
//       return res.status(400).json({ message: 'Project Name and at least one Project Type are required' });
//     }
//     const project = new Project({ name, projectTypes, address });
//     await project.save();
//     res.status(201).json(project);
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to create project' });
//   }
// };

// // Update a project
// exports.updateProject = async (req, res) => {
//   try {
//     const { name, projectTypes, address } = req.body;
//     if (!name || !projectTypes || !Array.isArray(projectTypes) || projectTypes.length === 0) {
//       return res.status(400).json({ message: 'Project Name and at least one Project Type are required' });
//     }
//     const project = await Project.findByIdAndUpdate(
//       req.params.id,
//       { name, projectTypes, address, createdAt: new Date() },
//       { new: true }
//     );
//     if (!project) return res.status(404).json({ message: 'Project not found' });
//     res.json(project);
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to update project' });
//   }
// };

// // Delete a project
// exports.deleteProject = async (req, res) => {
//   try {
//     const project = await Project.findByIdAndDelete(req.params.id);
//     if (!project) return res.status(404).json({ message: 'Project not found' });
//     res.json({ message: 'Project deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to delete project' });
//   }
// };