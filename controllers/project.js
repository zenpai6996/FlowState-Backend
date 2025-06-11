import Workspace from "../models/workspace.js";
import Project from "../models/project.js";

const createProject = async (req, res) => {
  try {
    const {workspaceId} = req.params;
    const {title, description, status,startDate,dueDate,tags,members} = req.body;
    const workspace = await Workspace.findById(workspaceId);

    if(!workspace){
      return res.status(500).json({message:"Workspace not found"});
    }

    const isMember = workspace.members.some((member) => member.user.toString() === req.user._id.toString());

    if(!isMember){
      return res.status(401).json({
        message:"You are not a member of this workspace"
      })
    }

    const tagArray = tags ? tags.split(",") : [];

    const newProject =await Project.create({
      title,
      description,
      status,
      startDate,
      dueDate,
      tags:tagArray,
      workspace:workspaceId,
      members,
      createdBy:req.user._id,
    });

    workspace.projects.push(newProject._id);
    await workspace.save();

    return res.status(201).json({
      message:"Project Created Successfully",
      project:newProject,
      workspace:workspaceId
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message:"Internal Server Error",
    })
  }
}

export {createProject}; 