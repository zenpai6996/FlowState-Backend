import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import routes from "./routes/index.js";

dotenv.config();


const app = express();

//db connection
mongoose.connect(process.env.MONGO_URI).then(()=> console.log("DB Connected")).catch((err) => console.log("Failed to connect to database",err));


app.use(cors({
  origin:process.env.FRONTEND_URL,
  methods:["GET","POST","DELETE","PUT"],
  allowedHeaders:["Content-Type","Authorization"],
}));
app.use(morgan("dev"));


app.use(express.json());

const PORT = process.env.PORT || 5000

app.get("/" , async(req,res) => {
  res.status(200).json({
    message:"Welcome to FlowState API"
  });
});

//localhost3000/api-v1/...
app.use("/api-v1",routes)

//error middleware
app.use((err,req,res , next) => {
  console.log(err.stack);
  res.status(500).json({message:"Internal Server Error ⊙﹏⊙∥"})
})

//not Found middleware
app.use((req,res) => {
  res.status(404).json({
    message:"404 Not Found (⊙_⊙)？"
  })
});

app.listen(PORT , () => {
  console.log(`server is running on port ${PORT}`);
});

