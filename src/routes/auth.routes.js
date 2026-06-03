import { Router } from "express";
import { changeCurrentPassword, forgotPasswordRequest, getCurrentUser, login, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetForgotPassword, verifyEmail } from "../controllers/auth.controller.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userChangeCurrentPasswordValidator, userForgotPasswordValidator, userLoginValidator, userRegisterValidator } from "../validators/index.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

//router.route("/register") - request has reached route now waiting to reach registerUser there we will process it 

//-->>unsecured route
//register
router
    .route("/register")
    .post(userRegisterValidator(), validate, registerUser);

//login
router
    .route("/login")
    .post(userLoginValidator(), validate, login);

//verifyEmail
router
    .route("/verify-email/:verificationToken")
    .get(verifyEmail)

//refreshToken
router
    .route("/refresh-token")
    .post(refreshAccessToken)

//forgotPassword
router
    .route("/forgot-password")
    .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

//reset-password
router
    .route("/reset-password/:resetToken")
    .post(resetForgotPassword);


//--->>>>secure routes
//logout
router.route("/logout").post(verifyJWT, logoutUser);

//currentUser
router
    .route("/current-user")
    .post(verifyJWT, getCurrentUser);

//changePassword
router
    .route("/change-password")
    .post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);

//resend-email-verification
router
    .route("/resend-email-verification")
    .post(verifyJWT, resendEmailVerification);
export default router;
