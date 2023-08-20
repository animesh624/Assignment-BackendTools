const mongoose = require("mongoose");

const connectDatabase = () => {
  console.log(process.env.DB_URI);
  mongoose.connect(process.env.DB_URI)
  .then(()=>{
    console.log("Connected to Database");
  })
  .catch(()=>{
    console.log("Failed to connect to Database");
  })
}

module.exports=connectDatabase;
