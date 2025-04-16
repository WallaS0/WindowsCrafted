import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { InsertDevice, InsertCommand, InsertActivity } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";

// WebSocket clients store
interface ConnectedClient {
  ws: WebSocket;
  deviceId?: string; // If this is a device client
  userId?: number;   // If this is a user client (web dashboard)
}

let connectedClients: ConnectedClient[] = [];

// Helper to broadcast updates to connected clients
function broadcastToClients(data: any, excludeClient?: WebSocket) {
  connectedClients.forEach(client => {
    if (client.ws !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  });
}

// Helper to send to specific device
function sendToDevice(deviceId: string, data: any) {
  const deviceClient = connectedClients.find(client => client.deviceId === deviceId);
  if (deviceClient && deviceClient.ws.readyState === WebSocket.OPEN) {
    deviceClient.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// Helper to generate a registration code
function generateRegistrationCode(): string {
  const segments = 4;
  const segmentLength = 4;
  const segments_arr = [];
  
  for (let i = 0; i < segments; i++) {
    segments_arr.push(randomBytes(segmentLength).toString('hex').toUpperCase().slice(0, segmentLength));
  }
  
  return segments_arr.join('-');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Auth middleware for API routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Error handling for Zod validation
  const validateRequest = (schema: z.ZodType<any, any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: error.errors 
          });
        }
        next(error);
      }
    };
  };

  // Devices API
  app.get("/api/devices", requireAuth, async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", requireAuth, async (req, res) => {
    try {
      const device = await storage.getDeviceById(parseInt(req.params.id));
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.delete("/api/devices/:id", requireAuth, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getDeviceById(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      await storage.removeDevice(deviceId);
      
      // Create activity for device removal
      await storage.createActivity({
        deviceId: device.deviceId,
        activityType: "status",
        description: "Device removed",
        status: "completed",
        details: { removedBy: req.user!.username }
      });
      
      // Broadcast device list update
      broadcastToClients({
        type: "DEVICE_REMOVED",
        deviceId: device.deviceId
      });
      
      res.status(200).json({ message: "Device removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove device" });
    }
  });

  // Registration Code API
  app.post("/api/registration-code", requireAuth, async (req, res) => {
    try {
      const code = generateRegistrationCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
      
      const registrationCode = await storage.createRegistrationCode({
        code,
        expiresAt
      });
      
      res.status(201).json({ 
        code: registrationCode.code,
        expiresAt: registrationCode.expiresAt
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate registration code" });
    }
  });

  // Commands API
  const commandSchema = z.object({
    deviceId: z.string(),
    command: z.string(),
    parameters: z.record(z.any()).optional()
  });

  app.post("/api/commands", requireAuth, validateRequest(commandSchema), async (req, res) => {
    try {
      const { deviceId, command, parameters } = req.body;
      
      // Check if device exists
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Create the command
      const newCommand = await storage.createCommand({
        deviceId,
        command,
        parameters: parameters || {}
      });
      
      // Create activity for command creation
      await storage.createActivity({
        deviceId,
        activityType: "command",
        description: `Command created: '${command}'`,
        status: "pending",
        details: { commandId: newCommand.id, parameters }
      });
      
      // Try to send command to device if online
      const delivered = sendToDevice(deviceId, {
        type: "COMMAND",
        command: newCommand
      });
      
      // If device is not connected, mark as pending
      if (!delivered && device.status === "online") {
        await storage.updateDeviceStatus(deviceId, "offline");
        broadcastToClients({
          type: "DEVICE_STATUS_CHANGED",
          deviceId,
          status: "offline"
        });
      }
      
      res.status(201).json(newCommand);
    } catch (error) {
      res.status(500).json({ message: "Failed to create command" });
    }
  });

  app.get("/api/commands", requireAuth, async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      
      if (deviceId) {
        const commands = await storage.getCommandsByDeviceId(deviceId);
        return res.json(commands);
      }
      
      const commands = await storage.getAllCommands();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });

  // Activities API
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const deviceId = req.query.deviceId as string | undefined;
      
      if (deviceId) {
        const activities = await storage.getActivitiesByDeviceId(deviceId);
        return res.json(activities);
      }
      
      const activities = await storage.getAllActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Stats API
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      const commands = await storage.getAllCommands();
      
      const stats = {
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === "online").length,
        offlineDevices: devices.filter(d => d.status === "offline").length,
        pendingCommands: commands.filter(c => c.status === "pending").length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    const clientInfo: ConnectedClient = { ws };
    connectedClients.push(clientInfo);
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'AUTH') {
          if (data.token) {
            // This would be device authentication with token in real implementation
            // For now, just register device connection
            clientInfo.deviceId = data.deviceId;
            console.log(`Device ${data.deviceId} authenticated`);
            
            // Update device status to online
            const device = await storage.getDeviceByDeviceId(data.deviceId);
            if (device) {
              await storage.updateDeviceStatus(data.deviceId, "online");
              
              // Create activity for device connection
              await storage.createActivity({
                deviceId: data.deviceId,
                activityType: "status",
                description: "Device connected",
                status: "completed"
              });
              
              // Broadcast device status change
              broadcastToClients({
                type: "DEVICE_STATUS_CHANGED",
                deviceId: data.deviceId,
                status: "online"
              }, ws);
            }
          } else if (data.userId) {
            // User authentication for web client
            clientInfo.userId = data.userId;
            console.log(`User ${data.userId} connected`);
          }
        }
        
        // Handle command response from device
        if (data.type === 'COMMAND_RESPONSE' && clientInfo.deviceId) {
          const { commandId, status, result } = data;
          
          // Update command in storage
          const command = await storage.updateCommand(commandId, {
            status,
            result: result || '',
            completedAt: new Date()
          });
          
          if (command) {
            // Create activity for command completion
            await storage.createActivity({
              deviceId: command.deviceId,
              activityType: "command",
              description: `Command ${status}: '${command.command}'`,
              status,
              details: { commandId, result }
            });
            
            // Broadcast command status update
            broadcastToClients({
              type: "COMMAND_STATUS_CHANGED",
              commandId,
              status,
              result
            });
          }
        }
        
        // Handle device info update
        if (data.type === 'DEVICE_INFO' && clientInfo.deviceId) {
          const device = await storage.getDeviceByDeviceId(clientInfo.deviceId);
          if (device) {
            await storage.updateDevice(device.id, {
              info: data.info
            });
            
            // Broadcast device info update
            broadcastToClients({
              type: "DEVICE_INFO_UPDATED",
              deviceId: clientInfo.deviceId,
              info: data.info
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', async () => {
      console.log('WebSocket client disconnected');
      
      // If a device client disconnects, update its status
      if (clientInfo.deviceId) {
        await storage.updateDeviceStatus(clientInfo.deviceId, "offline");
        
        // Create activity for device disconnection
        await storage.createActivity({
          deviceId: clientInfo.deviceId,
          activityType: "status",
          description: "Device disconnected",
          status: "completed"
        });
        
        // Broadcast device status change
        broadcastToClients({
          type: "DEVICE_STATUS_CHANGED",
          deviceId: clientInfo.deviceId,
          status: "offline"
        });
      }
      
      // Remove client from connected clients
      connectedClients = connectedClients.filter(c => c.ws !== ws);
    });
  });

  return httpServer;
}
