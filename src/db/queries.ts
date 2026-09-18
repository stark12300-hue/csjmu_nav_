import { db } from './index.ts';
import { users, campusEvents, campusLocations } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || '',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || '',
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to get/create user:', error);
    throw new Error('User database operation failed', { cause: error });
  }
}

export async function getDbEvents() {
  try {
    return await db.select().from(campusEvents);
  } catch (error) {
    console.error('Failed to query campus_events:', error);
    throw new Error('Database query for events failed', { cause: error });
  }
}

export async function insertDbEvent(event: typeof campusEvents.$inferInsert) {
  try {
    return await db.insert(campusEvents).values(event).onConflictDoNothing().returning();
  } catch (error) {
    console.error('Failed to insert event into database:', error);
    throw new Error('Failed to insert event', { cause: error });
  }
}

export async function getDbLocations() {
  try {
    return await db.select().from(campusLocations);
  } catch (error) {
    console.error('Failed to query campus_locations:', error);
    throw new Error('Database query for locations failed', { cause: error });
  }
}
