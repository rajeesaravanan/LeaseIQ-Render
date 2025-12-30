require("dotenv").config();
const express = require("express");
const corsMiddleware = require("./config/cors");

const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.use("/api", require("./routes"));

app.get("/", (req, res) => {
  res.send("LeaseIQ API running");
});

module.exports = app;
