import User  from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRoles, UserRoleEnum } from "../utils/constants.js";
//import { pipeline } from "nodemailer/lib/xoauth2/index.js";
//Optional to increase functionality
// import {
//   emailVerificationMailgenContent,
//   forgotPasswordMailgenContent,
//   sendEmail,
// } from "../utils/mail.js";
// import jwt from "jsonwebtoken";
// import crypto from "node:crypto";

//boiler plate
const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        //collect all document that matches this criteria
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      //now from select project we will use lookup in it.
      //looks into project
      $lookup: {
        from: "projects",
        localField: "project", //this is where my localfield ie. project and in foreign document this is what we have to match ie. _id therefore this is how localfield and foreignField get matched and we get a data from this matching
        foreignField: "_id",
        as: "project",
        pipeline: [
          //looks into project members
          //Further we some query in those select document
          {
            $lookup: {
              from: "projectmembers",
              localField: "_id",
              foreignField: "project",
              as: "projectMembers",
            },
          },
          {
          //add how many field are there ie. count members
            $addFields: {
              members: {
                $size: "$projectMembers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$project",
    },
    {
      //In final version of pipeline collecting the data that I want finally export out of this method
      $project: {
        project: {
          _id: 1,
          name: 1,
          description: 1,
          members: 1,
          createdAt: 1,
          createdBy: 1,
        },
        role: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200, 
        projects,
        "Projects fetched successfully"
      )
    );
});

const getProjectById = asyncHandler(async (req, res) => {
    //this projectId should be mentioned same as in routes as well.
    const { projectId } = req.params

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200, project,
          "Project fetched successfully"
        )
      );    
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id), //whatever object_id we r passing up, it is 100% mongoose object
  });

  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    project: new mongoose.Types.ObjectId(project._id),
    role: UserRoleEnum.ADMIN,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created Successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      name,
      description,
    },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProjects = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project Deleted successfully "));
});

const addMembersToProjects = asyncHandler(async (req, res) => {
    const { email, role } = req.body
    const { projectId } = req.params
    const user = await User.findOne({ email })
    
    if (!user) {
        throw new ApiError(404, "User does not exists")
    }
    // const project = await Project.findById(projectId);

    // if (!project) {
    //     throw new ApiError(404,"Project not found")
    // }


    await ProjectMember.findOneAndUpdate(
    //finding same user
        {
            user: new mongoose.Types.ObjectId(user._id),
            project: new mongoose.Types.ObjectId(projectId)
        },
        //updating role of user
        {
            user: new mongoose.Types.ObjectId(user._id),
            project: new mongoose.Types.ObjectId(projectId),
            role: role
        },
        {
            new: true, //return updated documents to us.
            upsert: true, //creates new document if it does not exists
        }
    )
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          {},
          "Project member added successfully"
        )
      );
});

const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params
    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError("Project not found")
    }

    const projectMembers = await ProjectMember.aggregate([
        {
            //when we run this projectId this means project is match and some document will be collected at this point (filtering document).
            $match: {
                project: new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            //means to look
            $lookup: {
                from: "users", //look from users table
                localField: "user", //in my localfield we r storing it as user table
                foreignField: "_id", //this is what we r matching one to one 
                as: "user",
                //now we want to add more pipeline
                pipeline: [
                    {
                        //i want to find some data in project
                        $project: {
                            _id: 1,
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        //to add more field , add another aggression pipeline
        {
            $addFields: {
                user: {
                    $arrayElemAt: ["$user",0]
                }
            }
        },
        //now to get data 
        {
            $project: {
                project: 1,
                user: 1,
                role: 1,
                createdAt: 1,
                updatedAt: 1,
                _id: 0,
            }
        }
    ])

    return res
        .status(201)
        .json(
        new ApiResponse(200,projectMembers, "Project members fetched"))
});

const updateMemberRole = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params
    const { newRole } = req.body
    if (!projectId) {
        throw new ApiErrorError("Project does not exists");
        
    }
    if (!AvailableUserRoles.includes(newRole)) {
        throw new ApiError(400, " Invalid Role")
    }
    
    let projectMember = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(userId),
    });

    if (!projectMember) {
        throw new Error(400, "Project member not found");
        
    }

    projectMember = await ProjectMember.findByIdAndUpdate(
        //provide what u r looking up for 
        projectMember._id, {
            //once we found that projectId then update role 
            role: newRole
    },
        {
            new: true, // to get updated data
        }
    )

    if (!projectMember) {
        throw new Error(404, "Project member not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, projectMember, "Project member role updated successfully"));
});

const deleteMember = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;
    if (!projectId) {
        throw new ApiErrorError("Project does not exists");
    }

    //finding projectMember
    let projectMember = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(userId),
    });

    if (!projectMember) {
      throw new Error(400, "Project member not found");
    }

    projectMember = await ProjectMember.findByIdAndDelete(
      //provide what u r looking up for
      projectMember._id,
      
    );

    if (!projectMember) {
      throw new Error(404, "Project member not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          projectMember,
          "Project member deleted successfully",
        ),
      );
});

export {
  addMembersToProjects,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProjects,
  updateMemberRole,
};
