import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

//basic configurations (accepting data)
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//cors configurations
app.use(
  cors({
    //takes configuable object
    origin: process.env.CORS_ORIGIN?.split(",") ||
      "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }),
);
//we want to listen on "/" page then add simple callback function 

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"


app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);


app.get("/", (req, res) => {
    res.send("Welcome to basecampy");
})
export default app;


/*
Short notes :-

### Why do we add `CORS_ORIGIN` in the `.env` file?

**Short answer:**
To **control which frontend origins are allowed** to communicate with our backend — **without changing code**.

---

## Core Reason: Configuration ≠ Code

CORS rules are **environment-specific**, not business logic.

| Environment | Allowed Origins               |
| ----------- | ----------------------------- |
| Development | `http://localhost:5173`       |
| Staging     | `https://staging.example.com` |
| Production  | `https://example.com`         |

Placing `CORS_ORIGIN` in `.env` lets us change allowed frontends **per environment** safely.

---

## What does `CORS_ORIGIN=*` mean?

```env
CORS_ORIGIN=*
```

* Allows **any origin** to access backend
* Useful for:

  * Early development
  * Public APIs
* ❌ **Not recommended for production** (security risk)

---

## Why comma-separated origins?

```env
CORS_ORIGIN=https://example.com,https://another.com
```

* Allows **multiple specific frontends**
* Common when:

  * Web app + admin panel
  * Multiple deployed frontends
* Split in code using:

```js
process.env.CORS_ORIGIN.split(",")
```

---

## Why NOT hardcode this in `app.js`?

❌ Bad practice:

```js
origin: ["https://example.com"]
```

Problems:

* Requires code changes for every environment
* Risk of pushing wrong origin to production
* Not scalable

✅ Good practice:

```js
origin: process.env.CORS_ORIGIN
```

---

## Security Perspective

* Prevents **unauthorized websites** from calling your backend
* Protects:

  * Cookies
  * Auth headers
  * User data

---

## Final takeaway (one line)

👉 **`CORS_ORIGIN` is kept in `.env` to securely and flexibly control which frontends can access the backend across different environments.**

*/