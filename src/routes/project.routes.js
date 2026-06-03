import { Router } from "express";

import {
  addMembersToProjects,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProjects,
  updateMemberRole,
} from "../controllers/project.controllers.js";

import { validate } from "../middlewares/validator.middleware.js";

import {
  createProjectValidator,
  addMembertoProjectValidator,
} from "../validators/index.js";

import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";

import {
  AvailableTaskStatuses,
  AvailableUserRoles, UserRoleEnum
} from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRoles), getProjectById)
  .put(
    validateProjectPermission([UserRoleEnum.ADMIN]),
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(validateProjectPermission([UserRoleEnum.ADMIN]), deleteProjects);

router
  //when we put : then it takes params but when we dont put : it does not take params
  .route("/:projectId/members")
  .get(getProjectMembers)
  .post(
    validateProjectPermission([UserRoleEnum.ADMIN]),
    addMembertoProjectValidator(),
    validate,
    addMembersToProjects,
  );

router
  .route("/:projectId/members/:userId")
  .put(validateProjectPermission([UserRoleEnum.ADMIN]), updateMemberRole)
  .delete(validateProjectPermission([UserRoleEnum.ADMIN]), deleteMember);

  
export default router;
