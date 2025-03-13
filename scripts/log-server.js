#!/usr/bin/env node

// This is a simple server to capture and display browser console logs in terminal
// Run this alongside your vite dev server to see browser logs in your terminal

import { WebSocketServer } from 'ws';
import chalk from 'chalk';
import figlet from 'figlet';

// Configuration
const PORT = process.env.LOG_PORT || 8766;

// Initialize WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Display startup header
console.log(
  chalk.cyan(
    figlet.textSync('Piano Logger', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    })
  )
);

console.log(chalk.green('Log server started on port ' + PORT));
console.log(chalk.yellow('Waiting for browser connections...'));
console.log(chalk.dim('-------------------------------------------'));

// Track connected clients
let clients = 0;

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients++;
  const clientId = `Client-${clients}`;
  
  console.log(chalk.green(`✓ Browser connected: ${clientId}`));
  
  // Handle messages from browser
  ws.on('message', (message) => {
    try {
      const logData = JSON.parse(message.toString());
      
      // Format and display the log
      formatAndPrintLog(logData, clientId);
    } catch (e) {
      console.error('Error parsing message:', e);
      console.log('Raw message:', message.toString());
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log(chalk.red(`✗ Browser disconnected: ${clientId}`));
  });
  
  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', message: 'Log server connected' }));
});

// Format and print logs to terminal
function formatAndPrintLog(log, clientId) {
  const timestamp = new Date().toLocaleTimeString();
  const client = chalk.dim(`[${clientId}]`);
  
  let logPrefix = '';
  let logMessage = '';
  let color = chalk.white;
  
  // Set color and prefix based on log level
  switch (log.level) {
    case 'debug':
      color = chalk.gray;
      logPrefix = chalk.blue('🔍 DEBUG');
      break;
    case 'info':
      color = chalk.blue;
      logPrefix = chalk.blue('ℹ️ INFO');
      break;
    case 'warn':
      color = chalk.yellow;
      logPrefix = chalk.yellow('⚠️ WARN');
      break;
    case 'error':
      color = chalk.red;
      logPrefix = chalk.red('❌ ERROR');
      break;
    case 'success':
      color = chalk.green;
      logPrefix = chalk.green('✓ SUCCESS');
      break;
    case 'music':
      color = chalk.magenta;
      logPrefix = chalk.magenta('🎵 MUSIC');
      break;
    case 'piano':
      color = chalk.cyan;
      logPrefix = chalk.cyan('🎹 PIANO');
      break;
    case 'perf':
      color = chalk.yellowBright;
      logPrefix = chalk.yellowBright('⚡ PERF');
      break;
    default:
      logPrefix = chalk.white('LOG');
  }
  
  // Format and print the log message
  const context = log.context ? chalk.cyan(`[${log.context}]`) : '';
  const time = chalk.dim(`[${timestamp}]`);
  
  console.log(`${time} ${client} ${logPrefix} ${context} ${color(log.message)}`);
  
  // Print additional data if provided
  if (log.data) {
    try {
      if (typeof log.data === 'object') {
        console.log(chalk.dim(JSON.stringify(log.data, null, 2)));
      } else {
        console.log(chalk.dim(log.data));
      }
    } catch (e) {
      console.log(chalk.dim('[Complex data]'));
    }
  }
}

// Handle server shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down log server...'));
  wss.close(() => {
    console.log(chalk.green('Log server stopped'));
    process.exit(0);
  });
}); 