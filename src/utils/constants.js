export const UserRoleEnum = {//here we sending whole object at once 
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member"
}

export const AvailableUserRoles = Object.values(UserRoleEnum);//here we are sending array

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);