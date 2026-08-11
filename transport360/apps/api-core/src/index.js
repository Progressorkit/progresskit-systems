const http = require('http');
const port = process.env.PORT || 3000;
const host = 'localhost';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Transport360 API Core');
});

server.listen(port, () => {
  console.log(`Server listening at http://${host}:${port}`);
});
