import Workspace from "../models/workspace.js";
import Project from "../models/project.js"

const createWorkspace = async(req,res) =>{
  try {
    const {name, description,color} = req.body;

    const workspace = new Workspace({
      name,
      description,
      color,
      owner: req.user._id, // Assuming req.user is set by auth middleware
      members: [{
        user: req.user._id, // Add the owner as a member
        role: 'admin', // Owner is an admin
        joinedAt: new Date(),
      }],
    });
    await workspace.save(); // Save to database before responding

    res.status(201).json(workspace);

  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Internal Server Error"});
  }
}

const getWorkspaces = async(req,res) =>{
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id // Find workspaces where the user is a member
    }).sort({createdAt: -1}); // Sort by creation date, most recent first
    res.status(200).json(workspaces);
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Internal Server Error"});
  }
}

const getWorkspaceDetails = async (req,res) => {
  try {
    const {workspaceId} = req.params;
    const workspace = await Workspace.findOne({_id:workspaceId,"members.user":req.user._id}).populate(
      "members.user",
      "name email profilePicture"
    );
    if(!workspace){
      return res.status(404).json({
        message:"Workspace not found"
      });
    }

    res.status(200).json(workspace);

  } catch (error) {
   console.log(error);
   res.status(500).json({
    message:"Internal Server Error"
   }) 
  }
}

const getWorkspaceProjects = async (req,res) => {
  try {
    const {workspaceId} = req.params;
    const workspace = await Workspace.findOne({_id:workspaceId,"members.user":req.user._id}).populate(
      "members.user","name email profilePicture"
    ); 

    if(!workspace) {
      return res.status(404).json({
        message:"Workspace not found"
      })
    }

    const projects = await Project.find({
      workspace:workspaceId,
      isArchived:false,
      members:{$in: [req.user._id]},
    })
    .populate("tasks","status")
    .sort({createdAt:-1});

    res.status(200).json(projects,workspace);


  } catch (error) {
    console.log(error);
    res.status(500).json({
      message:"Internal Server Error"
    })
  }
}

export {createWorkspace,getWorkspaces ,getWorkspaceDetails,getWorkspaceProjects};