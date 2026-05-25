import dotenv from "dotenv"
import app from "./app.js";

import connectDB from "./db/index.js";
dotenv.config({
    path: "./.env"
})
// let myusername = process.env.username;
// console.log("value: ", myusername);
// console.log("Start of an backend project");

//import express from "express" this is created in app.js file therefore remove from here or comment it out.
//const express = require("express");
//onst app = express();

const port = process.env.PORT || 3000;

/*this is actually connecting and listening to the port
app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
*/

//here we want to listen to the port once it has connected to the database.

connectDB()
    .then(() => {
        app.listen(port, () => {
          console.log(`Example app listening on port http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error", err)
        process.exit(1)
    })