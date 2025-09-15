import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Security check - only allow requests from localhost
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied - only localhost is allowed' });
  }
});

// Execute command endpoint
app.post('/exec', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  // Basic command sanitization
  if (command.includes('rm -rf') || command.includes('sudo')) {
    return res.status(403).json({ error: 'Potentially dangerous command rejected' });
  }
  
  console.log(`Executing command: ${command}`);
  
  exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    res.json({ 
      output: stdout || stderr || 'Command executed (no output)',
      error: error ? error.message : null
    });
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'Local proxy running' });
});

const PORT = process.env.PROXY_PORT || 3030;

app.listen(PORT, () => {
  console.log(`Local proxy server running on port ${PORT}`);
  console.log(`IMPORTANT: Only requests from localhost are accepted for security reasons`);
}); 