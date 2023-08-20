const express = require('express');
const app = express();
app.use(express.json());

// .env configuration
require('dotenv').config()

//Database connection
const connectDatabase=require('./config/database');
connectDatabase();

const dataRoute=require('./routes/dataRoute');

app.use("/api/v1",dataRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
