// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes as randomBytes2 } from "crypto";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  devices;
  commands;
  activities;
  registrationCodes;
  sessionStore;
  currentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.devices = /* @__PURE__ */ new Map();
    this.commands = /* @__PURE__ */ new Map();
    this.activities = /* @__PURE__ */ new Map();
    this.registrationCodes = /* @__PURE__ */ new Map();
    this.currentId = {
      users: 1,
      devices: 1,
      commands: 1,
      activities: 1,
      registrationCodes: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // Prune expired entries every 24h
    });
    this.createUser({
      username: "admin",
      password: "admin123",
      // This will be hashed by auth.ts
      name: "Admin User"
    }).then((user) => {
      console.log("Default admin user created");
    });
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentId.users++;
    const user = { ...insertUser, id, role: "user" };
    this.users.set(id, user);
    return user;
  }
  // Device methods
  async getAllDevices() {
    return Array.from(this.devices.values());
  }
  async getDeviceById(id) {
    return this.devices.get(id);
  }
  async getDeviceByDeviceId(deviceId) {
    return Array.from(this.devices.values()).find(
      (device) => device.deviceId === deviceId
    );
  }
  async getDeviceByRegistrationCode(code) {
    return Array.from(this.devices.values()).find(
      (device) => device.registrationCode === code
    );
  }
  async createDevice(device) {
    const id = this.currentId.devices++;
    const now = /* @__PURE__ */ new Date();
    const newDevice = {
      ...device,
      id,
      createdAt: now,
      lastActive: now,
      info: {}
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }
  async updateDevice(id, updatedFields) {
    const device = this.devices.get(id);
    if (!device) return void 0;
    const updatedDevice = { ...device, ...updatedFields };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  async updateDeviceStatus(deviceId, status) {
    const device = Array.from(this.devices.values()).find(
      (device2) => device2.deviceId === deviceId
    );
    if (!device) return void 0;
    const updatedDevice = {
      ...device,
      status,
      lastActive: /* @__PURE__ */ new Date()
    };
    this.devices.set(device.id, updatedDevice);
    return updatedDevice;
  }
  async removeDevice(id) {
    return this.devices.delete(id);
  }
  // Command methods
  async getAllCommands() {
    return Array.from(this.commands.values());
  }
  async getCommandsByDeviceId(deviceId) {
    return Array.from(this.commands.values()).filter(
      (command) => command.deviceId === deviceId
    );
  }
  async getCommandById(id) {
    return this.commands.get(id);
  }
  async createCommand(command) {
    const id = this.currentId.commands++;
    const now = /* @__PURE__ */ new Date();
    const newCommand = {
      ...command,
      id,
      createdAt: now,
      status: "pending",
      result: "",
      completedAt: null
    };
    this.commands.set(id, newCommand);
    return newCommand;
  }
  async updateCommand(id, updatedFields) {
    const command = this.commands.get(id);
    if (!command) return void 0;
    const updatedCommand = { ...command, ...updatedFields };
    if (updatedFields.status === "completed" || updatedFields.status === "failed") {
      updatedCommand.completedAt = /* @__PURE__ */ new Date();
    }
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }
  // Activity methods
  async getAllActivities(limit) {
    const activities = Array.from(this.activities.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (limit) {
      return activities.slice(0, limit);
    }
    return activities;
  }
  async getActivitiesByDeviceId(deviceId) {
    return Array.from(this.activities.values()).filter((activity) => activity.deviceId === deviceId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createActivity(activity) {
    const id = this.currentId.activities++;
    const now = /* @__PURE__ */ new Date();
    const newActivity = {
      ...activity,
      id,
      createdAt: now
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  // Registration code methods
  async createRegistrationCode(code) {
    const id = this.currentId.registrationCodes++;
    const now = /* @__PURE__ */ new Date();
    const newCode = {
      ...code,
      id,
      isUsed: false,
      createdAt: now
    };
    this.registrationCodes.set(id, newCode);
    return newCode;
  }
  async getRegistrationCodeByCode(code) {
    return Array.from(this.registrationCodes.values()).find(
      (regCode) => regCode.code === code && !regCode.isUsed && new Date(regCode.expiresAt) > /* @__PURE__ */ new Date()
    );
  }
  async markRegistrationCodeAsUsed(code) {
    const regCode = Array.from(this.registrationCodes.values()).find(
      (regCode2) => regCode2.code === code
    );
    if (!regCode) return void 0;
    const updatedCode = { ...regCode, isUsed: true };
    this.registrationCodes.set(regCode.id, updatedCode);
    return updatedCode;
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "remote-control-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name: name || username
      });
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userWithoutPassword = { ...req.user };
    delete userWithoutPassword.password;
    res.json(userWithoutPassword);
  });
}

// server/routes.ts
import { z } from "zod";
import { ZodError } from "zod";
var connectedClients = [];
function broadcastToClients(data, excludeClient) {
  connectedClients.forEach((client) => {
    if (client.ws !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  });
}
function sendToDevice(deviceId, data) {
  const deviceClient = connectedClients.find((client) => client.deviceId === deviceId);
  if (deviceClient && deviceClient.ws.readyState === WebSocket.OPEN) {
    deviceClient.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}
function generateRegistrationCode() {
  const segments = 4;
  const segmentLength = 4;
  const segments_arr = [];
  for (let i = 0; i < segments; i++) {
    segments_arr.push(randomBytes2(segmentLength).toString("hex").toUpperCase().slice(0, segmentLength));
  }
  return segments_arr.join("-");
}
async function registerRoutes(app2) {
  setupAuth(app2);
  const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  const validateRequest = (schema) => {
    return (req, res, next) => {
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
  app2.get("/api/devices", requireAuth, async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });
  app2.get("/api/devices/:id", requireAuth, async (req, res) => {
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
  app2.delete("/api/devices/:id", requireAuth, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      await storage.removeDevice(deviceId);
      await storage.createActivity({
        deviceId: device.deviceId,
        activityType: "status",
        description: "Device removed",
        status: "completed",
        details: { removedBy: req.user.username }
      });
      broadcastToClients({
        type: "DEVICE_REMOVED",
        deviceId: device.deviceId
      });
      res.status(200).json({ message: "Device removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove device" });
    }
  });
  app2.post("/api/registration-code", requireAuth, async (req, res) => {
    try {
      const code = generateRegistrationCode();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
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
  const commandSchema = z.object({
    deviceId: z.string(),
    command: z.string(),
    parameters: z.record(z.any()).optional()
  });
  app2.post("/api/commands", requireAuth, validateRequest(commandSchema), async (req, res) => {
    try {
      const { deviceId, command, parameters } = req.body;
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      const newCommand = await storage.createCommand({
        deviceId,
        command,
        parameters: parameters || {}
      });
      await storage.createActivity({
        deviceId,
        activityType: "command",
        description: `Command created: '${command}'`,
        status: "pending",
        details: { commandId: newCommand.id, parameters }
      });
      const delivered = sendToDevice(deviceId, {
        type: "COMMAND",
        command: newCommand
      });
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
  app2.get("/api/commands", requireAuth, async (req, res) => {
    try {
      const deviceId = req.query.deviceId;
      if (deviceId) {
        const commands2 = await storage.getCommandsByDeviceId(deviceId);
        return res.json(commands2);
      }
      const commands = await storage.getAllCommands();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });
  app2.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const deviceId = req.query.deviceId;
      if (deviceId) {
        const activities2 = await storage.getActivitiesByDeviceId(deviceId);
        return res.json(activities2);
      }
      const activities = await storage.getAllActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });
  app2.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      const commands = await storage.getAllCommands();
      const stats = {
        totalDevices: devices.length,
        onlineDevices: devices.filter((d) => d.status === "online").length,
        offlineDevices: devices.filter((d) => d.status === "offline").length,
        pendingCommands: commands.filter((c) => c.status === "pending").length
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    const clientInfo = { ws };
    connectedClients.push(clientInfo);
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "AUTH") {
          if (data.token) {
            clientInfo.deviceId = data.deviceId;
            console.log(`Device ${data.deviceId} authenticated`);
            const device = await storage.getDeviceByDeviceId(data.deviceId);
            if (device) {
              await storage.updateDeviceStatus(data.deviceId, "online");
              await storage.createActivity({
                deviceId: data.deviceId,
                activityType: "status",
                description: "Device connected",
                status: "completed"
              });
              broadcastToClients({
                type: "DEVICE_STATUS_CHANGED",
                deviceId: data.deviceId,
                status: "online"
              }, ws);
            }
          } else if (data.userId) {
            clientInfo.userId = data.userId;
            console.log(`User ${data.userId} connected`);
          }
        }
        if (data.type === "COMMAND_RESPONSE" && clientInfo.deviceId) {
          const { commandId, status, result } = data;
          const command = await storage.updateCommand(commandId, {
            status,
            result: result || "",
            completedAt: /* @__PURE__ */ new Date()
          });
          if (command) {
            await storage.createActivity({
              deviceId: command.deviceId,
              activityType: "command",
              description: `Command ${status}: '${command.command}'`,
              status,
              details: { commandId, result }
            });
            broadcastToClients({
              type: "COMMAND_STATUS_CHANGED",
              commandId,
              status,
              result
            });
          }
        }
        if (data.type === "DEVICE_INFO" && clientInfo.deviceId) {
          const device = await storage.getDeviceByDeviceId(clientInfo.deviceId);
          if (device) {
            await storage.updateDevice(device.id, {
              info: data.info
            });
            broadcastToClients({
              type: "DEVICE_INFO_UPDATED",
              deviceId: clientInfo.deviceId,
              info: data.info
            });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    ws.on("close", async () => {
      console.log("WebSocket client disconnected");
      if (clientInfo.deviceId) {
        await storage.updateDeviceStatus(clientInfo.deviceId, "offline");
        await storage.createActivity({
          deviceId: clientInfo.deviceId,
          activityType: "status",
          description: "Device disconnected",
          status: "completed"
        });
        broadcastToClients({
          type: "DEVICE_STATUS_CHANGED",
          deviceId: clientInfo.deviceId,
          status: "offline"
        });
      }
      connectedClients = connectedClients.filter((c) => c.ws !== ws);
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
