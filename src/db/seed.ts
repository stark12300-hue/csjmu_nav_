import { db } from './index.ts';
import { campusEvents, campusLocations } from './schema.ts';
import fs from 'fs';
import path from 'path';

async function seedData() {
  console.log('Starting seed into Cloud SQL...');

  // 1. Seed Campus Events
  try {
    const eventsPath = path.join(process.cwd(), 'data', 'campusEvents.json');
    if (fs.existsSync(eventsPath)) {
      const rawEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
      if (Array.isArray(rawEvents) && rawEvents.length > 0) {
        console.log(`Found ${rawEvents.length} events to seed...`);
        for (const ev of rawEvents) {
          await db.insert(campusEvents).values({
            id: ev.id,
            title: ev.title || 'Untitled Event',
            description: ev.description || '',
            category: ev.category || 'General',
            startDate: ev.startDate || '',
            endDate: ev.endDate || '',
            time: ev.time || '',
            venue: ev.venue || '',
            posterImage: ev.posterImage || '',
            organizer: ev.organizer || '',
            contactEmail: ev.contactEmail || '',
            status: ev.status || 'approved',
            isLive: ev.isLive ?? true,
            likesCount: ev.likesCount || 0,
          }).onConflictDoUpdate({
            target: campusEvents.id,
            set: {
              title: ev.title || 'Untitled Event',
              description: ev.description || '',
              likesCount: ev.likesCount || 0,
            }
          });
        }
        console.log('Events seeded successfully!');
      }
    }
  } catch (err) {
    console.error('Error seeding events:', err);
  }

  // 2. Seed Campus Locations / Departments from csjmuCampusData.ts
  try {
    const { CSJMU_LOCATIONS } = await import('../data/csjmuCampusData.ts');
    if (Array.isArray(CSJMU_LOCATIONS) && CSJMU_LOCATIONS.length > 0) {
      console.log(`Found ${CSJMU_LOCATIONS.length} locations to seed...`);
      for (const loc of CSJMU_LOCATIONS) {
        await db.insert(campusLocations).values({
          id: loc.id,
          title: loc.title || 'Untitled Location',
          hindiTitle: loc.hindiTitle || '',
          category: loc.category || 'general',
          coordinates: loc.coordinates || [26.4983, 80.2658],
          block: loc.block || '',
          floor: loc.floor || '',
          image: loc.image || '',
          description: loc.description || '',
          hindiDescription: loc.hindiDescription || '',
          facilities: loc.facilities || [],
          isCustom: loc.isCustom || false,
        }).onConflictDoUpdate({
          target: campusLocations.id,
          set: {
            title: loc.title || 'Untitled Location',
            hindiTitle: loc.hindiTitle || '',
            description: loc.description || '',
          }
        });
      }
      console.log('Locations seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding locations:', err);
  }

  console.log('Database seeding complete!');
  process.exit(0);
}

seedData();
