import { CampusEvent } from '../types';
import {
  getAdminAuthHeaders,
  getAdminToken,
  getAdminPin,
  isAdminAuthenticated,
  getTeacherAuthHeaders,
  getTeacherToken,
  isTeacherAuthenticated,
  getLoggedInTeacher,
  syncLocalEventsWithRemote,
  getStoredEvents,
} from './storage';
import {
  saveEventToFirestore,
  deleteEventFromFirestore,
  getEventsFromFirestore,
} from '../services/firebase';

function resolveAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Admin authentication (PIN, Token, or Active Session)
  if (isAdminAuthenticated() || getAdminToken() || getAdminPin()) {
    const adminHeaders = getAdminAuthHeaders();
    Object.assign(headers, adminHeaders);
  }

  // Teacher authentication (Signed Token, Session, or Teacher ID)
  if (isTeacherAuthenticated() || getTeacherToken() || getLoggedInTeacher()) {
    const teacherHeaders = getTeacherAuthHeaders();
    Object.assign(headers, teacherHeaders);
  }

  return headers;
}

/**
 * Merge the server event feed with Firestore.
 * Firestore is authoritative for events that were created/edited/approved
 * through the client. This prevents the Vercel/GitHub file cache from
 * overwriting a newer Firestore approval with an older server snapshot.
 */
function mergeEventSources(serverEvents: CampusEvent[], firestoreEvents: CampusEvent[]): CampusEvent[] {
  const merged = new Map<string, CampusEvent>();
  serverEvents.forEach((event) => merged.set(event.id, event));
  firestoreEvents.forEach((event) => merged.set(event.id, event));
  return Array.from(merged.values()).sort((a, b) => {
    const dateA = new Date(a.startDate || '').getTime() || a.createdAt || 0;
    const dateB = new Date(b.startDate || '').getTime() || b.createdAt || 0;
    return dateB - dateA;
  });
}

/**
 * Fetch latest campus events from cloud server (/api/events)
 * Updates local cache and notifies UI subscribers.
 */
export async function fetchRemoteEvents(): Promise<CampusEvent[]> {
  let serverEvents: CampusEvent[] = [];
  let firestoreEvents: CampusEvent[] = [];

  try {
    const res = await fetch('/api/events?ts=' + Date.now(), {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.events)) {
        serverEvents = data.events;
      }
    }
  } catch (err) {
    console.warn('Could not fetch events from server:', err);
  }

  try {
    firestoreEvents = await getEventsFromFirestore();
  } catch (err) {
    console.warn('Could not fetch events from Firestore:', err);
  }

  if (serverEvents.length > 0 || firestoreEvents.length > 0) {
    const updated = mergeEventSources(serverEvents, firestoreEvents);
    syncLocalEventsWithRemote(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csjmu_events_synced', { detail: { events: updated } }));
    }
    return updated;
  }

  return getStoredEvents();
}

/**
 * Post a new event to cloud server (/api/events)
 * Works for Teachers (auto-approved & live), Admins (approved & live), and Students (pending review).
 */
export async function postRemoteEvent(
  eventData: CampusEvent
): Promise<{ success: boolean; message?: string; event?: CampusEvent; events?: CampusEvent[] }> {
  // Always mirror directly to Firestore cloud database
  saveEventToFirestore(eventData).catch((e) => console.warn('Firestore event save notice:', e));

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...resolveAuthHeaders(),
    };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      if (Array.isArray(data.events)) {
        syncLocalEventsWithRemote(data.events);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('csjmu_events_synced', {
            detail: { event: data.event, events: data.events },
          })
        );
      }
      return {
        success: true,
        message: data.message,
        event: data.event,
        events: data.events || getStoredEvents(),
      };
    }

    return {
      success: false,
      message: data?.message || 'Failed to post event to cloud server.',
    };
  } catch (err: any) {
    console.error('Remote event post error:', err);
    return {
      success: false,
      message: err?.message || 'Network error while posting event to cloud.',
    };
  }
}

// Queue to serialize outbound event network requests and prevent concurrency collisions
let eventNetworkQueue = Promise.resolve<any>(null);
function queueEventUpdate<T>(fn: () => Promise<T>): Promise<T> {
  const next = eventNetworkQueue.then(() => fn(), () => fn());
  eventNetworkQueue = next;
  return next;
}

/**
 * Update an existing event on cloud server (/api/events/:id)
 */
export async function updateRemoteEvent(
  eventId: string,
  updates: Partial<CampusEvent>
): Promise<{ success: boolean; message?: string; event?: CampusEvent; events?: CampusEvent[] }> {
  return queueEventUpdate(async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...resolveAuthHeaders(),
      };

      const localTarget = getStoredEvents().find((e) => e.id === eventId);
      const payload = {
        ...(localTarget || {}),
        ...updates,
        id: eventId,
      };

      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));

      // Persist the final server result to Firestore when the API accepted it.
      // If the API is unavailable, persist the requested update directly so
      // approval/live status is not lost on the next Vercel restart.
      const eventToPersist = (res.ok && data?.success && data?.event)
        ? (data.event as CampusEvent)
        : (payload as CampusEvent);
      const firestoreSaved = await saveEventToFirestore(eventToPersist);

      if (res.ok && data?.success) {
        const firestoreEvents = await getEventsFromFirestore();
        const serverEvents = Array.isArray(data.events) ? data.events as CampusEvent[] : [];
        const merged = mergeEventSources(serverEvents, firestoreEvents);
        syncLocalEventsWithRemote(merged);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('csjmu_events_synced', {
              detail: { event: eventToPersist, events: merged },
            })
          );
        }
        return {
          success: true,
          message: data.message,
          event: eventToPersist,
          events: merged,
        };
      }

      // Firestore is the durable fallback for approval/live updates.
      if (firestoreSaved) {
        const firestoreEvents = await getEventsFromFirestore();
        const merged = mergeEventSources([], firestoreEvents);
        syncLocalEventsWithRemote(merged);
        return {
          success: true,
          message: 'Event update saved to Firestore.',
          event: eventToPersist,
          events: merged,
        };
      }

      return {
        success: false,
        message: data?.message || 'Failed to update event on cloud server.',
      };
    } catch (err: any) {
      console.error('Remote event update error:', err);
      return {
        success: false,
        message: err?.message || 'Network error while updating event on cloud.',
      };
    }
  });
}

/**
 * Batch toggle live status on cloud server for multiple events simultaneously
 */
export async function batchToggleRemoteEvents(
  eventIds: string[],
  isLive: boolean
): Promise<{ success: boolean; message?: string; events?: CampusEvent[] }> {
  return queueEventUpdate(async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...resolveAuthHeaders(),
      };

      const res = await fetch('/api/events/batch-toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventIds, isLive }),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));

      // Persist the final live state to Firestore after the server accepts it.
      // This keeps the state durable even if the Vercel filesystem/GitHub copy
      // is later rehydrated from an older snapshot.
      const localEvents = getStoredEvents();
      for (const id of eventIds) {
        const target = localEvents.find((e) => e.id === id);
        if (target) {
          await saveEventToFirestore({ ...target, isLive });
        }
      }

      if (res.ok && data?.success) {
        const firestoreEvents = await getEventsFromFirestore();
        const serverEvents = Array.isArray(data.events) ? data.events as CampusEvent[] : [];
        const merged = mergeEventSources(serverEvents, firestoreEvents);
        syncLocalEventsWithRemote(merged);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('csjmu_events_synced', {
              detail: { events: merged },
            })
          );
        }
        return {
          success: true,
          message: data.message,
          events: merged,
        };
      }

      const firestoreEvents = await getEventsFromFirestore();
      if (firestoreEvents.length > 0) {
        const merged = mergeEventSources([], firestoreEvents);
        syncLocalEventsWithRemote(merged);
        return {
          success: true,
          message: 'Event live status saved to Firestore.',
          events: merged,
        };
      }

      return {
        success: false,
        message: data?.message || 'Failed to batch toggle events on cloud server.',
      };
    } catch (err: any) {
      console.error('Remote batch toggle error:', err);
      return {
        success: false,
        message: err?.message || 'Network error while batch toggling events on cloud.',
      };
    }
  });
}

/**
 * Delete an event on cloud server (/api/events/:id)
 */
export async function deleteRemoteEvent(
  eventId: string
): Promise<{ success: boolean; message?: string; events?: CampusEvent[] }> {
  // Mirror deletion to Firestore
  deleteEventFromFirestore(eventId).catch(() => {});

  try {
    const headers = {
      ...resolveAuthHeaders(),
    };

    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      if (Array.isArray(data.events)) {
        syncLocalEventsWithRemote(data.events);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('csjmu_events_synced', {
            detail: { events: data.events },
          })
        );
      }
      return {
        success: true,
        message: data.message,
        events: data.events || getStoredEvents(),
      };
    }

    return {
      success: false,
      message: data?.message || 'Failed to delete event on cloud server.',
    };
  } catch (err: any) {
    console.error('Remote event delete error:', err);
    return {
      success: false,
      message: err?.message || 'Network error while deleting event on cloud.',
    };
  }
}
