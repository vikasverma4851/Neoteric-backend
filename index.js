const express = require("express");
require("dotenv").config({ path: "./.env" });
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const bodyParser = require("body-parser");
const emiRoutes = require("./routes/emiRoutes");
const paymentReconciliationRoutes = require("./routes/paymentReconciliationRoutes");
const paymentHistoryRoutes = require("./routes/paymentHistoryRoutes");
const projectRoutes = require("./routes/projectRoutes");
const { upload } = require("./middlewares/multerConfig")

const nocRoutes = require("./routes/nocRoutes");

const uploadRoutes = require('./routes/uploadRoutes');
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
// Routes
app.use("/api/payments", paymentRoutes);

app.use("/api/emi", emiRoutes);
app.use("/api/emi-receive", paymentReconciliationRoutes);
app.use("/api/payment-history",paymentHistoryRoutes);
app.use("/api/upload", uploadRoutes);

// Routes
app.use('/api/projects', projectRoutes);

app.use("/api/noc",nocRoutes );


const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
