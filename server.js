const handler = require('serve-handler');
const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: '.',
    cleanUrls: false,
    directoryListing: false
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
