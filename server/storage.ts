import { 
  users, type User, type InsertUser,
  devices, type Device, type InsertDevice,
  commands, type Command, type InsertCommand,
  activities, type Activity, type InsertActivity,
  registrationCodes, type RegistrationCode, type InsertRegistrationCode
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device methods
  getAllDevices(): Promise<Device[]>;
  getDeviceById(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  getDeviceByRegistrationCode(code: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined>;
  updateDeviceStatus(deviceId: string, status: string): Promise<Device | undefined>;
  removeDevice(id: number): Promise<boolean>;
  
  // Command methods
  getAllCommands(): Promise<Command[]>;
  getCommandsByDeviceId(deviceId: string): Promise<Command[]>;
  getCommandById(id: number): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: number, command: Partial<Command>): Promise<Command | undefined>;
  
  // Activity methods
  getAllActivities(limit?: number): Promise<Activity[]>;
  getActivitiesByDeviceId(deviceId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Registration code methods
  createRegistrationCode(code: InsertRegistrationCode): Promise<RegistrationCode>;
  getRegistrationCodeByCode(code: string): Promise<RegistrationCode | undefined>;
  markRegistrationCodeAsUsed(code: string): Promise<RegistrationCode | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private commands: Map<number, Command>;
  private activities: Map<number, Activity>;
  private registrationCodes: Map<number, RegistrationCode>;
  
  sessionStore: session.SessionStore;
  currentId: { 
    users: number; 
    devices: number; 
    commands: number; 
    activities: number;
    registrationCodes: number;
  };

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.commands = new Map();
    this.activities = new Map();
    this.registrationCodes = new Map();
    
    this.currentId = {
      users: 1,
      devices: 1,
      commands: 1,
      activities: 1,
      registrationCodes: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin123", // This will be hashed by auth.ts
      name: "Admin User"
    }).then(user => {
      console.log("Default admin user created");
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id, role: "user" };
    this.users.set(id, user);
    return user;
  }
  
  // Device methods
  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }
  
  async getDeviceById(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  
  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(
      (device) => device.deviceId === deviceId,
    );
  }
  
  async getDeviceByRegistrationCode(code: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(
      (device) => device.registrationCode === code,
    );
  }
  
  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.currentId.devices++;
    const now = new Date();
    const newDevice: Device = { 
      ...device, 
      id, 
      createdAt: now,
      lastActive: now,
      info: {}
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }
  
  async updateDevice(id: number, updatedFields: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updatedFields };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async updateDeviceStatus(deviceId: string, status: string): Promise<Device | undefined> {
    const device = Array.from(this.devices.values()).find(
      (device) => device.deviceId === deviceId,
    );
    
    if (!device) return undefined;
    
    const updatedDevice = { 
      ...device, 
      status,
      lastActive: new Date()
    };
    
    this.devices.set(device.id, updatedDevice);
    return updatedDevice;
  }
  
  async removeDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
  }
  
  // Command methods
  async getAllCommands(): Promise<Command[]> {
    return Array.from(this.commands.values());
  }
  
  async getCommandsByDeviceId(deviceId: string): Promise<Command[]> {
    return Array.from(this.commands.values()).filter(
      (command) => command.deviceId === deviceId,
    );
  }
  
  async getCommandById(id: number): Promise<Command | undefined> {
    return this.commands.get(id);
  }
  
  async createCommand(command: InsertCommand): Promise<Command> {
    const id = this.currentId.commands++;
    const now = new Date();
    const newCommand: Command = { 
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
  
  async updateCommand(id: number, updatedFields: Partial<Command>): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;
    
    const updatedCommand = { ...command, ...updatedFields };
    if (updatedFields.status === "completed" || updatedFields.status === "failed") {
      updatedCommand.completedAt = new Date();
    }
    
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }
  
  // Activity methods
  async getAllActivities(limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (limit) {
      return activities.slice(0, limit);
    }
    
    return activities;
  }
  
  async getActivitiesByDeviceId(deviceId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((activity) => activity.deviceId === deviceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentId.activities++;
    const now = new Date();
    const newActivity: Activity = { 
      ...activity, 
      id, 
      createdAt: now
    };
    
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  // Registration code methods
  async createRegistrationCode(code: InsertRegistrationCode): Promise<RegistrationCode> {
    const id = this.currentId.registrationCodes++;
    const now = new Date();
    const newCode: RegistrationCode = { 
      ...code, 
      id, 
      isUsed: false,
      createdAt: now
    };
    
    this.registrationCodes.set(id, newCode);
    return newCode;
  }
  
  async getRegistrationCodeByCode(code: string): Promise<RegistrationCode | undefined> {
    return Array.from(this.registrationCodes.values()).find(
      (regCode) => regCode.code === code && !regCode.isUsed && new Date(regCode.expiresAt) > new Date(),
    );
  }
  
  async markRegistrationCodeAsUsed(code: string): Promise<RegistrationCode | undefined> {
    const regCode = Array.from(this.registrationCodes.values()).find(
      (regCode) => regCode.code === code,
    );
    
    if (!regCode) return undefined;
    
    const updatedCode = { ...regCode, isUsed: true };
    this.registrationCodes.set(regCode.id, updatedCode);
    return updatedCode;
  }
}

export const storage = new MemStorage();
