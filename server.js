const WebSocket = require('ws');
const SerialPort = require('serialport');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  port: process.env.PORT || 3000,
  websocketPort: process.env.WS_PORT || 8000,
  rs232: {
    baudRate: 9600,
    defaultPort: process.env.SERIAL_PORT || '/dev/ttyUSB0'
  }
};

// Logger
const logger = {
  log: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => console.debug(`[DEBUG] ${message}`)
};

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: config.websocketPort });
logger.log(`WebSocket server started on port ${config.websocketPort}`);

// Track connected clients
let connectedClients = 0;

// Handle WebSocket connections
wss.on('connection', (ws) => {
  connectedClients++;
  logger.log(`Client connected (${connectedClients} total)`);

  // Handle client disconnection
  ws.on('close', () => {
    connectedClients--;
    logger.log(`Client disconnected (${connectedClients} remaining)`);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'info',
    message: 'Connected to NFC Reader Server'
  }));
});

// Broadcast message to all connected clients
function broadcast(message) {
  const payload = JSON.stringify(message);
  logger.debug(`Broadcasting: ${payload}`);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// RS232 NFC Reader
class Rs232Reader {
  constructor() {
    this.serialPort = null;
    this.receivedData = '';
    this.lastEmittedData = null;
    this.initSerialPort();
  }

  async initSerialPort() {
    try {
      // List available serial ports
      const ports = await SerialPort.list();
      logger.log(`Available serial ports: ${ports.map(p => p.path).join(', ')}`);

      // Use the configured port
      const portPath = config.rs232.defaultPort;
      logger.log(`Using RS232 port: ${portPath}`);

      // Initialize serial port
      this.serialPort = new SerialPort(portPath, {
        baudRate: config.rs232.baudRate,
        autoOpen: false
      });

      this.serialPort.open();

      // Initialize receivedData to empty string
      this.receivedData = '';

      // Handle data received from the serial port
      this.serialPort.on('data', (data) => {
        // Convert buffer to string and append to receivedData
        const dataStr = data.toString();
        this.receivedData += dataStr;

        // Debug the received data
        logger.debug(`Received data: ${dataStr} (buffer length: ${this.receivedData.length})`);

        // Check if we have a complete message
        if (this.receivedData.includes('\r\n')) {
          // Process each complete message in the buffer
          const messages = this.receivedData.split('\r\n');

          // Keep the last incomplete message (if any)
          this.receivedData = messages.pop() || '';

          // Process complete messages
          for (const message of messages) {
            if (message.length >= 10) { // Adjust minimum length as needed
              const trimmedMessage = message.trim();
              const badgeId = trimmedMessage.substring(2); // Extract badge ID from message

              logger.log(`Badge detected → ${badgeId}`);

              // Prevent duplicate badge reads
              if (badgeId !== this.lastEmittedData) {
                // Broadcast badge ID to all connected clients
                broadcast({
                  type: 'badge',
                  id: badgeId,
                  timestamp: new Date().toISOString()
                });

                // Update last emitted data
                this.lastEmittedData = badgeId;

                // Reset lastEmittedData after timeout
                setTimeout(() => {
                  this.lastEmittedData = null;
                }, 5000);
              } else {
                logger.debug(`Duplicate badge read detected: ${badgeId}`);
              }
            }
          }
        }
      });

      // Handle serial port errors
      this.serialPort.on('error', (err) => {
        logger.error(`Serial port error: ${err.message}`);
      });

      // Handle serial port opening
      this.serialPort.on('open', () => {
        logger.log('Serial port opened successfully');
      });

    } catch (error) {
      logger.error(`Error initializing RS232 reader: ${error.message}`);
    }
  }
}

// Initialize the RS232 reader
const reader = new Rs232Reader();

// Handle process termination
process.on('SIGINT', () => {
  logger.log('Server shutting down...');
  
  // Close WebSocket server
  wss.close(() => {
    logger.log('WebSocket server closed');
    
    // Close serial port if open
    if (reader.serialPort && reader.serialPort.isOpen) {
      reader.serialPort.close(() => {
        logger.log('Serial port closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Log server start
logger.log('NFC Reader Server started');
logger.log(`Listening for RS232 NFC reader on ${config.rs232.defaultPort}`);
logger.log(`WebSocket server running on port ${config.websocketPort}`);
