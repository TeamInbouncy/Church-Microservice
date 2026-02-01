const app = require("./app");
const { config } = require("./config/env");

const {
  server: { port },
} = config;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
