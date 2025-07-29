const http = require('http');

console.log('Starting simple server...');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('This should stay running...');
  
  // Log every 5 seconds to show it's still alive
  setInterval(() => {
    console.log('Server still running at', new Date().toTimeString());
  }, 5000);
});

// Prevent exit
process.stdin.resume();
