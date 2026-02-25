import { users, type User, type UpsertUser, type UserCredential } from "@shared/models/auth";
import { db } from "../../db";
import { eq, desc } from "drizzle-orm";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getCredential(userId: string, provider: string): Promise<UserCredential | undefined>;
  getCredentialByEmail(email: string, provider: string): Promise<{ user: User; credential: UserCredential } | undefined>;
  createCredential(data: { userId: string; provider: string; passwordHash?: string; providerAccountId?: string }): Promise<UserCredential>;
}

function rowToUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    profileImageUrl: r.profile_image_url,
    createdAt: r.created_at ? new Date(r.created_at) : null,
    updatedAt: r.updated_at ? new Date(r.updated_at) : null,
  } as User;
}

function rowToCredential(r: any): UserCredential {
  return {
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    passwordHash: r.password_hash,
    providerAccountId: r.provider_account_id,
    createdAt: r.created_at ? new Date(r.created_at) : null,
  } as UserCredential;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
    if (result.rows.length === 0) return undefined;
    return rowToUser(result.rows[0]);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }
    const result = await pool.query(
      `INSERT INTO users (email, first_name, last_name, profile_image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userData.email || null, userData.firstName || null, userData.lastName || null, userData.profileImageUrl || null]
    );
    return rowToUser(result.rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getCredential(userId: string, provider: string): Promise<UserCredential | undefined> {
    const result = await pool.query(
      "SELECT * FROM user_credentials WHERE user_id = $1 AND provider = $2 LIMIT 1",
      [userId, provider]
    );
    if (result.rows.length === 0) return undefined;
    return rowToCredential(result.rows[0]);
  }

  async getCredentialByEmail(email: string, provider: string): Promise<{ user: User; credential: UserCredential } | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    const cred = await this.getCredential(user.id, provider);
    if (!cred) return undefined;
    return { user, credential: cred };
  }

  async createCredential(data: { userId: string; provider: string; passwordHash?: string; providerAccountId?: string }): Promise<UserCredential> {
    const result = await pool.query(
      "INSERT INTO user_credentials (user_id, provider, password_hash, provider_account_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [data.userId, data.provider, data.passwordHash || null, data.providerAccountId || null]
    );
    return rowToCredential(result.rows[0]);
  }
}

export const authStorage = new AuthStorage();
