console.log('TypeScript test starting...');

setTimeout(() => {
  console.log('Still running after 2 seconds');
}, 2000);

// Keep process alive
process.stdin.resume();