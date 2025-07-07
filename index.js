const express = require("express");
require("dotenv").config({ path: "./.env" });
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const bodyParser = require("body-parser");

// const uploadRoutes = require('./routes/uploadRoutes');
const cors = require("cors"); // Import the CORS package

// dotenv.config();
connectDB();

const app = express();

// Use CORS middleware
app.use(
  cors([
    "http://localhost:5173/",
    "https://veer.smartitbox.in/",
    "https://zakariya-frontend.vercel.app/",
  ])
); // This will allow all domains to access your API

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Backend Server Running...");
});

// app.use('/api/upload', uploadRoutes);

app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
// app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
