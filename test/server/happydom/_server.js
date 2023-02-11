const express = require('express')
const { parentPort, workerData } = require("worker_threads");

const port = workerData;

const app = express();
app.get("*.json", (req, res, next) => {
  const delay = parseInt(req.headers['x-test-delay']);
  setTimeout(() => next('route'), delay);
});
app.use(express.static(__dirname));
app.listen(port, () => {
  parentPort.postMessage('OK');
});
