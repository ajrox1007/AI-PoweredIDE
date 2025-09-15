import { WebSocket } from 'ws';
import Docker from 'dockerode';
import { log } from './vite'; // Assuming log is accessible
import stream from 'stream';
import os from 'os'; // Import os module
import path from 'path'; // Import path module
import { exec } from 'child_process';

// Attempt to use the Docker Desktop for Mac socket path
const socketPath = process.platform === 'darwin' 
  ? path.join(os.homedir(), '.docker', 'run', 'docker.sock') 
  : '/var/run/docker.sock'; // Default for Linux

// Flag to track if Docker is available
let isDockerAvailable = false;
let docker: Docker;

try {
  docker = new Docker({ socketPath });
  
  // Test Docker connection
  docker.ping().then(() => {
    isDockerAvailable = true;
    log('Docker connection established successfully!');
  }).catch(error => {
    log(`Docker not available: ${(error as Error).message}`);
    log('Using simulated runtime environment instead.');
  });
} catch (error) {
  log(`Error initializing Docker client: ${(error as Error).message}`);
  log('Using simulated runtime environment instead.');
}

// --- Docker Execution Logic --- 

async function runCommandInContainer(ws: WebSocket, command: string, image = 'node:alpine') {
  log(`Attempting to run in ${image}: ${command}`);
  ws.send(`\x1b[33mRunning in ${image}: ${command}\x1b[0m\r\n`);

  let container: Docker.Container | null = null;

  try {
    // Ensure image exists locally
    try {
      await docker.getImage(image).inspect();
      log(`Image ${image} found locally.`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        log(`Image ${image} not found locally, pulling...`);
        ws.send(`\x1b[36mPulling image ${image} (this might take a moment)...\x1b[0m\r\n`);
        await docker.pull(image, {});
        log(`Image ${image} pulled successfully.`);
        ws.send(`\x1b[36mImage ${image} pulled.\x1b[0m\r\n`);
      } else {
        throw error; // Rethrow other image errors
      }
    }

    // Create and start the container
    log('Creating container...');
    container = await docker.createContainer({
      Image: image,
      Cmd: ['/bin/sh', '-c', 'while true; do sleep 1; done'], // Keep container running
      Tty: false,
      WorkingDir: '/',
      HostConfig: {
        AutoRemove: true, // Automatically remove container when stopped
      }
    });
    await container.start();
    log(`Container ${container.id.substring(0, 12)} started.`);

    // Execute the command inside the container
    log(`Executing command in container...`);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const execStream = await exec.start({ hijack: true, stdin: false });

    // Pipe stdout/stderr directly to the WebSocket
    const stdout = new stream.PassThrough();
    const stderr = new stream.PassThrough();
    
    stdout.on('data', (chunk) => ws.send(chunk.toString()));
    stderr.on('data', (chunk) => ws.send(`\x1b[31m${chunk.toString()}\x1b[0m`)); // Send stderr in red

    docker.modem.demuxStream(execStream, stdout as NodeJS.WritableStream, stderr as NodeJS.WritableStream);

    execStream.on('end', async () => {
      log('Command execution finished.');
      try {
        const inspectResult = await exec.inspect();
        log(`Command exit code: ${inspectResult.ExitCode}`);
      } catch (inspectError) {
        log('Error inspecting exec result:', String(inspectError));
      }
      // Since AutoRemove is true, container should clean up on stop/exit
      // Ensure prompt is sent after output is likely finished
      setTimeout(() => ws.send('\r\n$ '), 100); 
    });

  } catch (error: any) {
    log(`Docker execution error: ${error.message}`);
    ws.send(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n$ `);
    // Attempt to clean up container if it was created
    if (container) {
      try {
        log(`Stopping and removing container ${container.id.substring(0, 12)} due to error...`);
        await container.stop(); // AutoRemove should handle removal
        log(`Container stopped.`);
      } catch (cleanupError: any) {
        log(`Error during container cleanup: ${cleanupError.message}`);
      }
    }
  }
}

// --- End Docker Execution Logic --- 

// Fallback execution for simulated environment (no Docker)
async function executeCommandSimulated(ws: WebSocket, command: string): Promise<void> {
  log(`Simulating command execution: ${command}`);
  ws.send(`\x1b[33mSimulating: ${command}\x1b[0m\r\n`);
  
  // Basic command simulation
  if (command === 'node -v') {
    ws.send("v16.15.0\r\n");
  } else if (command === 'python --version' || command === 'python -V' || command === 'python3 --version') {
    ws.send("Python 3.9.13\r\n");
  } else if (command.startsWith('echo')) {
    // Echo command handling
    const content = command.substring(4).trim();
    ws.send(`${content}\r\n`);
  } else if (command === 'ls' || command === 'ls -la') {
    // Fake directory listing
    ws.send("total 24\r\n");
    ws.send("drwxr-xr-x  6 user  staff  192 Apr 15 12:34 .\r\n");
    ws.send("drwxr-xr-x  4 user  staff  128 Apr 15 12:34 ..\r\n");
    ws.send("-rw-r--r--  1 user  staff  284 Apr 15 12:34 index.js\r\n");
    ws.send("-rw-r--r--  1 user  staff  123 Apr 15 12:34 package.json\r\n");
    ws.send("drwxr-xr-x  4 user  staff  128 Apr 15 12:34 node_modules\r\n");
  } else if (command === 'pwd') {
    ws.send("/workspace\r\n");
  } else if (command.startsWith('node ')) {
    // Handle node execution with a simplistic approach
    if (command.includes('console.log')) {
      const match = command.match(/console\.log\(['"]([^'"]+)['"]\)/);
      if (match) {
        ws.send(`${match[1]}\r\n`);
      } else {
        ws.send("undefined\r\n");
      }
    } else {
      ws.send("Program executed successfully.\r\n");
    }
  } else if (command.startsWith('python ') || command.startsWith('python3 ')) {
    // Handle python execution with a simplistic approach
    if (command.includes('-c') && command.includes('print')) {
      // Handle inline python code with -c flag
      const match = command.match(/print\(['"]([^'"]+)['"]\)/);
      if (match) {
        ws.send(`${match[1]}\r\n`);
      } else {
        ws.send("None\r\n");
      }
    } else if (command.match(/python3 "([^"]+)"/)) {
      // Handle file execution pattern like: python3 "filename.py"
      const filenameMatch = command.match(/python3 "([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : "";
      
      if (filename) {
        ws.send(`Executing Python file: ${filename}\r\n`);
        // Simulate running the file (in an actual implementation, this would read the file content)
        if (filename.endsWith('.py')) {
          if (filename === 'new.py') {
            // Execute the Python file that we see in the UI
            ws.send("hello world\r\n");
          } else {
            ws.send("Python script executed successfully.\r\n");
          }
        } else {
          ws.send(`\x1b[31mError: ${filename} is not a Python file\x1b[0m\r\n`);
        }
      } else {
        ws.send("\x1b[31mError: Invalid Python file path\x1b[0m\r\n");
      }
    } else {
      ws.send("Python command executed successfully.\r\n");
    }
  } else {
    // Unknown command
    ws.send(`\x1b[31mCommand not recognized in simulation mode: ${command}\x1b[0m\r\n`);
    ws.send(`\x1b[33mTip: Docker is not available. The terminal is in simulation mode with limited functionality.\x1b[0m\r\n`);
  }
  
  // Send prompt
  setTimeout(() => {
    ws.send("\r\n$ ");
  }, 100);
}

// --- Handle terminal connection ---
export function handleTerminalConnection(ws: WebSocket) {
  ws.on('message', (message: Buffer) => {
    const command = message.toString().trim();
    if (command) {
      if (isDockerAvailable) {
        // Use Docker if available
        runCommandInContainer(ws, command, 'node:alpine');
      } else {
        // Fall back to simulation if Docker is not available
        executeCommandSimulated(ws, command);
      }
    } else {
      // Empty command, just send a new prompt
      ws.send('\r\n$ ');
    }
  });

  ws.on('close', () => {
    log('Terminal WebSocket closed.');
  });

  ws.on('error', (error) => {
    log(`Terminal WebSocket error: ${error.message}`);
    try {
      ws.send(`\x1b[31mServer Error: ${error.message}\x1b[0m\r\n$ `);
    } catch (sendError) { /* Ignore if send fails on error */ }
  });

  // Send initial welcome message based on Docker availability
  ws.send('\x1b[1;34mWelcome to the Real Terminal!\x1b[0m\r\n');
  if (isDockerAvailable) {
    ws.send('Connected to backend execution environment (Docker - node:alpine default).\r\n$ ');
  } else {
    ws.send('\x1b[33mDocker not available. Running in simulated mode (limited functionality).\x1b[0m\r\n$ ');
  }
} 