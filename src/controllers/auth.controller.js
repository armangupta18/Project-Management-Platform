import User from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    //first find  that user by usedId and then them as user.
    //In bigger User we cannot access token method
    //In user this does 2 job -> get access of  method as well as it verify that userID exist in database or not.

    const user = await User.findById(userId);

    //generated tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //save data in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generatng access");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //if already user exists
  const { email, username, password, role } = req.body;
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists", []);
  }

  //new user then create
  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  //now user is register as we have userID in mongoDB
  //generate token
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  //now send an email so that same token can be send to user as well

  await sendEmail({
    //sending mail to user for which we have access
    email: user?.email,
    subject: "Please verify your email",
    //here we need to create dynamic link
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });
  //Now we don't want to send full user data, so we need to send limit amt of data
  //To do so we use -(which we dont want)
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        "User registered successfully and verification email has been sent on your email",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, " User does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options) //now send JSON response
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User looged in successfull",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //since request has user access therefore directly return this
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user feteched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  //S1 -> Collect the data as we have res.body same as we have res.params that directly provides the url itself

  //In Express, req.params is an object that contains route parameters.
  const { verificationToken } = req.params;
  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }
  // now we need to encypt/hash it again because we have send unhashed token to user
  //this is going to provide same HashedToken stored in database
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  //now match token and also find and check for expiry token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    //match with current time, Is it still now in current time.
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(
      400,
      "Email verification fails as Token is expired or invalid",
    );
  }
  //remove unecessary data
  user.emailVerificationExpiry = undefined;
  user.emailVerificationToken = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      "Email is verified",
    ),
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  //resend can done only if user are login already
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(404, "Email is already verified");
  }
  //follow process to send mail
  //here we r resending mail
  //First regenerate hashToken
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  //add generate token to data base
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  //saving database
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verfiy-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(202, {}, "Mail Has been sent to your email ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  //Token should be present
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    //decoding token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, " Invalid refersh token");
    }
    //checking token is present in database or not
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }
    //everything is okay
    const options = {
      httpOnly: true,
      secure: true,
    };

    //generate tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    //update refreshToken
    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken;

  user.forgotPasswordToken = hashedToken;
  user.forgotpasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`, //`${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail id",
      ),
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotpasswordExpiry: {$gt: Date.now()}
  })
  
  if (!user) {
    throw new ApiResponse(
      489,"Token is valid or expired"
    )
  }

  user.forgotpasswordExpiry = undefined
  user.forgotPasswordToken = undefined

  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset successfully"
    )
  )
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //get data from user
  const { oldPassword, newPassword } = req.body
  
  //check user exist or not
  const user = await User.findById(req.user?._id)
  
  //check entere oldPassword is correct or not
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordValid) {
    throw new ApiError(400,
      "Invalid old password"
    )
  }
  //save newPassword
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
})
export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword
};

/***
 * Great flow 👍
You’re thinking **exactly like a backend engineer**.
I’ll now explain **S1 → S8** in **simple language**, focusing on **WHY each step exists**, so you can **remember + reuse** this logic in any project.

---

# 🧠 BIG PICTURE (REGISTER USER FLOW)

> **Register user = Securely create account + verify ownership of email**

Order matters 👇
**Never change this sequence**

---

## 🔹 STEP-0 (Input idea)

> User sends data → Backend must **protect DB + security**

---

# ✅ S1 — Check if user already exists

### WHY?

To prevent:

* Duplicate accounts
* Same email / username reuse

```js
const { email, username, password, role } = req.body
```

👉 Extracts data sent from frontend

```js
const existedUser = await User.findOne({
    $or: [{ username }, { email }]
})
```

👉 MongoDB query:

* Checks **username OR email**
* If **any match**, user already exists

---

# ❌ S2 — If user exists, stop immediately

```js
if (existedUser) {
    throw new ApiError(
        409,
        "User with email or username already exists",
        []
    )
}
```

### WHY?

* **409 Conflict** = resource already exists
* Stop execution early
* Prevents unnecessary DB writes

🚫 **Fail fast = good backend practice**

---

# ✅ S3 — Create new user

```js
const user = User.create({
    email,
    password,
    username,
    isEmailVerified: false
})
```

### WHAT HAPPENS INTERNALLY?

* Password is hashed (via pre-save hook)
* MongoDB assigns `_id`
* User is now **registered but NOT verified**

📌 **User exists but cannot be trusted yet**

---

# 🔐 S4 — Generate temporary email-verification token

```js
const {
  unHashedToken,
  hashedToken,
  tokenExpiry
} = user.generateTemporaryToken()
```

### WHY 2 tokens?

| Token           | Purpose                |
| --------------- | ---------------------- |
| `unHashedToken` | Sent to user via email |
| `hashedToken`   | Stored safely in DB    |
| `tokenExpiry`   | Token auto-expires     |

📌 **Security rule**

> Never store raw tokens in DB

---

# 🔑 S5 — Generate Access & Refresh tokens

```js
const generateAccessAndRefreshTokens = async (userId) => {
```

### WHY this function exists?

* Keeps **auth logic separate**
* Reusable (login, refresh, register)

---

### Step-by-step inside S5

```js
const user = await User.findById(userId)
```

👉 Ensures:

* User exists
* Access to instance methods

```js
const accessToken = user.generateAccessToken()
const refreshToken = user.generateRefreshToken()
```

| Token         | Use                      |
| ------------- | ------------------------ |
| Access Token  | Short-lived (API access) |
| Refresh Token | Long-lived (get new AT)  |

```js
user.refreshToken = refreshToken
await user.save({ validateBeforeSave: false })
```

👉 Saves refresh token **without re-validating fields**

```js
return { accessToken, refreshToken }
```

---

# 📧 S6 — Send verification email

```js
await sendEmail({
    email: user.email,
    subject: "Please verify your email",
```

👉 Sends email **only after user is created**

```js
mailgenContent: emailVerificationMailgenContent(
    user.username,
    `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
)
```

### Link breakdown

```
http://localhost:8000/api/v1/users/verify-email/<token>
```

📌 When user clicks link:

* Backend hashes token
* Matches DB token
* Verifies email

---

# 🧹 S7 — Remove sensitive fields before response

```js
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
)
```

### WHY?

❌ Never send:

* password
* refreshToken
* verification tokens

✅ API should expose **minimum data**

---

# 🚨 S8 — Final response

```js
if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user")
}
```

👉 Safety check (DB failure)

---

```js
return res.status(201).json(
    new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email has been sent"
    )
)
```

### Why 201?

* Resource **created successfully**

---

# 🧠 ONE-LINE MEMORY FLOW (VERY IMPORTANT)

> **Validate → Check existence → Create user → Generate tokens → Send email → Clean response**

---

# ✅ THIS IS INDUSTRY-STANDARD REGISTRATION FLOW

You are implementing:
✔ Secure token handling
✔ Email verification
✔ Clean API responses
✔ Separation of concerns

---

## 🚀 What you should learn next (natural continuation)

1. Email verification controller
2. Login flow
3. Refresh token rotation
4. Logout (invalidate refresh token)
5. Rate-limit registration

If you want, say:

> **“Explain email verification controller flow”**

and we’ll continue step-by-step 🔥

 */
