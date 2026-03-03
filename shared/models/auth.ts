import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ==================== USERS ====================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = InferSelectModel<typeof users>;
export type UpsertUser = InferInsertModel<typeof users>;

// ==================== USER CREDENTIALS ====================
export const userCredentials = pgTable("user_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  passwordHash: text("password_hash"),
  providerAccountId: text("provider_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserCredential = InferSelectModel<typeof userCredentials>;

// ==================== AUDIT LOGS ====================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("info"),
  userId: text("user_id"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  path: text("path"),
  method: text("method"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type InsertAuditLog = InferInsertModel<typeof auditLogs>;

// ==================== API KEY ROTATIONS ====================
export const apiKeyRotations = pgTable("api_key_rotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  previousKeyHash: text("previous_key_hash"),
  newKeyHash: text("new_key_hash").notNull(),
  rotationType: text("rotation_type").notNull().default("automatic"),
  rotatedBy: text("rotated_by"),
  rotatedAt: timestamp("rotated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type InsertAPIKeyRotation = InferInsertModel<typeof apiKeyRotations>;

// ==================== API KEY METADATA ====================
export const apiKeyMetadata = pgTable("api_key_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyHash: text("key_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// ==================== IP WHITELIST ====================
export const ipWhitelist = pgTable("ip_whitelist", {
  id: uuid("id").defaultRandom().primaryKey(),
  ip: text("ip").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  enabled: timestamp("enabled"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IPWhitelist = InferSelectModel<typeof ipWhitelist>;
export type InsertIPWhitelist = InferInsertModel<typeof ipWhitelist>;

// ==================== SECURITY ALERTS ====================
export const securityAlerts = pgTable("security_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  alertType: text("alert_type").notNull(),
  channel: text("channel").notNull(),
  destination: text("destination").notNull(),
  enabled: timestamp("enabled"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SecurityAlert = InferSelectModel<typeof securityAlerts>;
export type InsertSecurityAlert = InferInsertModel<typeof securityAlerts>;

// ==================== ALERT HISTORY ====================
export const alertHistory = pgTable("alert_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertType: text("alert_type").notNull(),
  channel: text("channel").notNull(),
  destination: text("destination").notNull(),
  message: text("message"),
  status: text("status").notNull().default("sent"),
  auditLogId: text("audit_log_id"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type InsertAlertHistory = InferInsertModel<typeof alertHistory>;

// ==================== USER 2FA ====================
export const user2FA = pgTable("user_2fa", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  secret: text("secret").notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>().default([]),
  enabled: timestamp("enabled"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User2FA = InferSelectModel<typeof user2FA>;
export type Insert2FA = InferInsertModel<typeof user2FA>;
