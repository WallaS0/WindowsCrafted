import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  name: text("name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

// Device model
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // ios, android, windows
  os: text("os").notNull(),
  ipAddress: text("ip_address"),
  user: text("user"),
  status: text("status").notNull().default("offline"), // online, offline
  lastActive: timestamp("last_active").notNull().defaultNow(),
  registrationCode: text("registration_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  info: json("info").$type<DeviceInfo>(),
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  name: true,
  deviceId: true,
  platform: true,
  os: true,
  ipAddress: true,
  user: true,
  status: true,
  registrationCode: true,
});

// Command model
export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  command: text("command").notNull(),
  parameters: json("parameters"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  result: text("result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertCommandSchema = createInsertSchema(commands).pick({
  deviceId: true,
  command: true,
  parameters: true,
});

// Activity model
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  activityType: text("activity_type").notNull(), // command, file, screen, status
  description: text("description").notNull(),
  details: json("details"),
  status: text("status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  deviceId: true,
  activityType: true,
  description: true,
  details: true,
  status: true,
});

// Registration Codes
export const registrationCodes = pgTable("registration_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegistrationCodeSchema = createInsertSchema(registrationCodes).pick({
  code: true,
  expiresAt: true,
});

// Type definitions
export type DeviceInfo = {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  battery?: number;
  storage?: {
    total: number;
    free: number;
  };
  memory?: {
    total: number;
    free: number;
  };
  installedApps?: Array<{
    name: string;
    version: string;
    packageName: string;
  }>;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type Command = typeof commands.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertRegistrationCode = z.infer<typeof insertRegistrationCodeSchema>;
export type RegistrationCode = typeof registrationCodes.$inferSelect;
