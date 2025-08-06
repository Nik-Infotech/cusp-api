require("dotenv").config();
require("./db/db");
require("./utils/passport");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
const http = require("http").createServer(app);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// 🔸 Initialize passport session
app.use(passport.initialize());
app.use(passport.session());

const { Server } = require("socket.io");
const port = process.env.PORT || 3000;
const chatController = require("./controller/chatController");
const chatSocket = require("./websocket/chatSocket");

app.use(
  cors({
    // origin: '*',
    origin:
      process.env.PUBLIC_API_URL ||
      "http://31.97.56.234:8000" ||
      "http://localhost:8000" ||
      "https://cusp.dreamsquats.co.uk" ||
      "http://31.97.56.234:8081" ||
      "http://31.97.56.234:8001",
    methods: "GET,POST,PUT,PATCH,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    exposedHeaders: "Content-Length,X-Kuma-Revision",
    credentials: true,
    maxAge: 600,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("api working!");
});

app.use("/api", require("./routes/userRoutes"));
app.use("/api", require("./routes/tagRoutes"));
app.use("/api", require("./routes/postRoutes"));
app.use("/api", require("./routes/commentRoutes"));
app.use("/api", require("./routes/eventRoutes"));
app.use("/api", require("./routes/directoryRoutes"));
app.use("/api", require("./routes/courseRoutes"));
app.use("/api", require("./routes/chatRoutes"));
app.use("/api/auth", require("./routes/authRoutes")); // Google
app.use("/api", require("./routes/documentsRoutes"));

app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res
    .status(500)
    .json({ msg: "Internal ser Server Error", error: err.message });
});

const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
chatController.setSocketIoInstance(io);

chatSocket(io);

http.listen(port, () => {
  console.log(`Server running on ${process.env.PUBLIC_API_URL}`);
});
