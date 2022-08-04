const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

const app = express();

// Middleware: Logger - Morgan
app.use(logger("dev"));

// Middleware: CORS
app.use(cors({
  origin: 'http://localhost',
  optionsSuccessStatus: 200
}));

// Middleware: Praser: JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Middleware: Static Path
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/socket.io",
  express.static(path.join(__dirname, "node_modules/socket.io/client-dist"))
);

// Middleware: Router
app.use("/", indexRouter);
app.use("/users", usersRouter);

module.exports = app;
