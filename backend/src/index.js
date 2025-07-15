import dotenv from "dotenv"
import {httpServer} from "./app.js"
import connectDB  from "./db/index.js"


dotenv.config({
    path:"./.env",
})



connectDB()
.then(()=>{
    httpServer.listen(process.env.PORT||8000 ,()=>{
        console.log(`server is running at port:${process.env.PORT}`)
    })
})
  .catch((error) => {
    console.log("❌ Connection to MongoDB failed!!", error);
  });
