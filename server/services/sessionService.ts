import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface SessionInfo {
  sid: string;
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrentSession: boolean;
}

export async function getUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        sid,
        expire,
        sess
      FROM sessions 
      WHERE sess::text LIKE '%passport%'
        AND sess->'passport'->'user'->'claims'->>'sub' = ${userId}
        AND expire > NOW()
      ORDER BY expire DESC
    `);

    const sessions: SessionInfo[] = [];
    
    for (const row of result.rows) {
      const sess = row.sess as any;
      const claims = sess?.passport?.user?.claims;
      
      if (claims) {
        const iat = claims.iat ? new Date(claims.iat * 1000) : new Date();
        sessions.push({
          sid: row.sid as string,
          userId: claims.sub,
          email: claims.email || 'Unknown',
          createdAt: iat,
          expiresAt: new Date(row.expire as string),
          isCurrentSession: row.sid === currentSessionId,
        });
      }
    }

    return sessions;
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
}

export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      DELETE FROM sessions 
      WHERE sid = ${sessionId}
        AND sess->'passport'->'user'->'claims'->>'sub' = ${userId}
    `);

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

export async function deleteAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      DELETE FROM sessions 
      WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
        AND sid != ${currentSessionId}
    `);

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error deleting other sessions:', error);
    return 0;
  }
}
