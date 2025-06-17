import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { job } from "./libs/cron.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();

//db connection

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("DB Connected"))
	.catch((err) => console.log("Failed to connect to database", err));

const allowedOrigins = [
	"https://flowstate-omega.vercel.app",
	process.env.NODE_ENV === "development" && "http://localhost:5173",
].filter(Boolean); // This removes any falsey values

app.use(
	cors({
		origin: "https://flowstate-omega.vercel.app",
		methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"], // Add OPTIONS
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true, // If you're using cookies/auth headers
	})
);

app.use(morgan("dev"));

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", async (req, res) => {
	res.status(200).json({
		message: "Welcome to FlowState API",
	});
});

//localhost3000/api-v1/...

app.use("/", routes);

//error middleware
app.use((err, req, res, next) => {
	console.log(err.stack);
	res.status(500).json({ message: "Internal Server Error ⊙﹏⊙∥" });
});

//not Found middleware
app.use((req, res) => {
	res.status(404).json({
		message: "404 Not Found (⊙_⊙)？",
	});
});

//start cron job
if (job && typeof job.start === "function") {
	console.log("Starting cron job...");
	job.start();
} else {
	console.error("Cron job initialization failed!");
}
app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
	console.log(`server is running on port ${process.env.PORT || 5000}`);
});
