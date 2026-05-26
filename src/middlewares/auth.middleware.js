import User from "../models/user.models.js";
import {ProjectMember} from "../models/projectmember.models.js"
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

export const verifyJWT = asyncHandler(async (req, res, next) => {

    //get token from cookies(web Browser) OR header(Mobile)
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
      // S2: Verify & decode token
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      // S3: Find user from decoded token
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerifactionToken -emailVerificationExpiry",
      );
      if (!user) {
        throw new ApiError(401, "Invalid access Token");
      }

      // S4: Inject user into request
      req.user = user;
      next(); //move to controller or next middleware
    } catch (error) {
        throw new ApiError(401, "Invalid access Token");
    }
})


//accecpt array of roles
export const validateProjectPermission = (roles = []) => {
    return asyncHandler(async(req, res, next) => {
        const { projectId } = req.params;
         
        if (!projectId)
            throw new ApiError(400, "Project is missing ");
        //if present then we want too look into project member because it is one thing that actaully talk to user ans project 
        const project = await ProjectMember.findOne({
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(req.user._id)
        })

        if (!project) throw new ApiError(400, "Project not found ");
//this role i am picking from database because we cannot trust on user so we match role with help of userId and projectId
        const givenRole = project?.role
        req.user.role = givenRole

        //checking given role matches or not
        if (!roles.includes(givenRole)) {
            throw new ApiError(
                403,
                "You do not have permission to perform this action"
            )
        }
        //next that we can pass middleware and perform operation
        next();
    })
}