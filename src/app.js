const express = require("express");
const cors = require("cors");
const eventsRouter = require("./routes/eventsRoutes");
const groupsRouter = require("./routes/groupsRoutes");
const signupsRouter = require("./routes/signupsRoutes");
const { HttpError } = require("./utils/httpError");

const app = express();

app.use(
  cors({
    origin: ["https://www.poa.church"],
  })
);

app.use(express.json());

app.use("/events", eventsRouter);
app.use("/groups", groupsRouter);
app.use("/signups", signupsRouter);


app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("Unexpected server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
