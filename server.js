const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Server ทำงานแล้ว!");
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
