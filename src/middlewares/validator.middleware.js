import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

//I will give u a file, U will extract some errors from it and U need to just process them.

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    //not empty therefore extract that error and throw error.
    const extractedErrors = [];
    //pushing object 
    errors.array().map((err) => extractedErrors.push({
        [err.path]: err.msg
       }),
    );
    throw new ApiError(422, "Recieved data is not valid", extractedErrors);
}
