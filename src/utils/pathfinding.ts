import { CAMPUS_NODES, CAMPUS_EDGES } from '../data/csjmuCampusData';
import { CampusLocation, NavigationRoute, NavigationStep, RouteNode } from '../types';

// Calculate Euclidean distance in meters between two lat/lng pairs (Haversine formula)
export function getDistanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371000; // Radius of the earth in meters
  const lat1 = (coord1[0] * Math.PI) / 180;
  const lat2 = (coord2[0] * Math.PI) / 180;
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate compass bearing in degrees (0 - 360) from start coordinate to end coordinate
export function calculateBearing(start: [number, number], end: [number, number]): number {
  if (!start || !end) return 0;
  const lat1 = (start[0] * Math.PI) / 180;
  const lat2 = (end[0] * Math.PI) / 180;
  const dLng = ((end[1] - start[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Compute a target point offset by distance (meters) along a specific bearing
export function getDestinationCoordinate(
  start: [number, number],
  distanceMeters: number,
  bearingDeg: number
): [number, number] {
  const R = 6371000;
  const d = distanceMeters / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (start[0] * Math.PI) / 180;
  const lng1 = (start[1] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

// Find nearest route node in campus graph to a given coordinate
export function findNearestNode(coord: [number, number]): RouteNode {
  let minDistance = Infinity;
  let nearest = CAMPUS_NODES[0];

  for (const node of CAMPUS_NODES) {
    const dist = getDistanceMeters(coord, node.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  }
  return nearest;
}

// Check if coordinate is physically inside or adjacent to CSJMU Campus road network (within 120m of any campus node)
export function isCoordinateOnCampus(coord: [number, number]): boolean {
  if (!coord || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return false;
  for (const node of CAMPUS_NODES) {
    if (getDistanceMeters(coord, node.coordinates) <= 120) {
      return true;
    }
  }
  return false;
}

// Official Entrance Gates for CSJMU Campus
export const CAMPUS_GATES: CampusLocation[] = [
  {
    id: 'loc-gate-1',
    title: 'Main Gate 1 (GT Road)',
    hindiTitle: 'मुख्य गेट 1 (जीटी रोड)',
    category: 'gate',
    coordinates: [26.4958, 80.2642],
    block: 'Main Entrance',
    description: 'Primary university entrance on Grand Trunk (GT) Road',
  },
  {
    id: 'loc-gate-2',
    title: 'Gate 2 (UIET Entrance)',
    hindiTitle: 'गेट 2 (यूआईईटी प्रवेश द्वार)',
    category: 'gate',
    coordinates: [26.5028, 80.2635],
    block: 'UIET Sector',
    description: 'Kalyanpur side entrance near UIET engineering campus',
  },
  {
    id: 'loc-gate-3',
    title: 'Gate 3 (Stadium / Hostels)',
    hindiTitle: 'गेट 3 (स्टेडियम / छात्रावास)',
    category: 'gate',
    coordinates: [26.5055, 80.2708],
    block: 'Sports Complex',
    description: 'Entrance near Multi-purpose Hall and Student Hostels',
  },
];

export function getBestCampusEntranceGate(coords: [number, number]): CampusLocation {
  let best = CAMPUS_GATES[0];
  let minD = Infinity;
  for (const gate of CAMPUS_GATES) {
    const d = getDistanceMeters(coords, gate.coordinates);
    if (d < minD) {
      minD = d;
      best = gate;
    }
  }
  return best;
}

// Find nearest node by Location ID or actual coordinates
export function getNodeForLocation(location: CampusLocation): RouteNode {
  // If it's a dynamic or custom location, directly find nearest road node
  if (location.id.startsWith('user-') || location.id.startsWith('custom-') || location.isCustom) {
    return findNearestNode(location.coordinates);
  }

  // Direct matches
  const directMapping: Record<string, string> = {
    'loc-gate-1': 'node-gate-1',
    'loc-gate-2': 'node-gate-2',
    'loc-gate-3': 'node-gate-3',
    'loc-admin': 'node-admin-front',
    'loc-ssc-cell': 'node-admin-front',
    'loc-library': 'node-library-front',
    'loc-fountain': 'node-fountain',
    'loc-canteen': 'node-canteen-hub',
    'loc-auditorium': 'node-auditorium-front',
    'loc-uiet-1': 'node-uiet-junc-1',
    'loc-uiet-2': 'node-uiet-junc-2',
    'loc-uiet-3': 'node-uiet-junc-3',
    'loc-uiet-4': 'node-uiet-junc-4',
    'loc-uiet-workshop': 'node-workshop-front',
    'loc-health': 'node-health-center',
    'loc-mgmt': 'node-mgmt-front',
    'loc-law': 'node-law-front',
    'loc-arts': 'node-arts-front',
    'loc-mca': 'node-mca-front',
    'loc-pharmacy': 'node-pharmacy-front',
    'loc-lifesciences': 'node-lifescience-front',
    'loc-stadium': 'node-stadium-north',
    'loc-hostel-shivaji': 'node-hostel-shivaji',
    'loc-hostel-ganga': 'node-hostel-ganga',
    'loc-bank': 'node-bank-junction',
    'loc-guest-house': 'node-guest-house',
    'loc-english': 'node-english',
    'loc-materials-science': 'node-materials-science',
    'loc-lecture-hall': 'node-lecture-hall',
    'loc-university-school': 'node-university-school',
    'loc-evaluation-center': 'node-evaluation-center',
    'loc-education': 'node-education',
    'loc-hotel-management': 'node-hotel-management'
  };

  const nodeId = directMapping[location.id];
  if (nodeId) {
    const found = CAMPUS_NODES.find((n) => n.id === nodeId);
    if (found) {
      // Check if location was moved significantly (> 80 meters) from standard node
      const dist = getDistanceMeters(location.coordinates, found.coordinates);
      if (dist < 100) {
        return found;
      }
    }
  }

  return findNearestNode(location.coordinates);
}

// Determine turn action based on angle difference
function getTurnAction(
  prevBearing: number,
  newBearing: number
): { action: NavigationStep['action']; en: string; hi: string } {
  let diff = newBearing - prevBearing;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;

  if (Math.abs(diff) < 25) {
    return { action: 'straight', en: 'Continue straight', hi: 'सीधे आगे बढ़ें' };
  } else if (diff >= 25 && diff < 65) {
    return { action: 'slight-right', en: 'Take a slight right', hi: 'हल्के दाएं मुड़ें' };
  } else if (diff >= 65) {
    return { action: 'turn-right', en: 'Turn right', hi: 'दाएं मुड़ें' };
  } else if (diff <= -25 && diff > -65) {
    return { action: 'slight-left', en: 'Take a slight left', hi: 'हल्के बाएं मुड़ें' };
  } else {
    return { action: 'turn-left', en: 'Turn left', hi: 'बाएं मुड़ें' };
  }
}

// Dijkstra Shortest Path Engine
export function calculateCampusRoute(
  fromLocation: CampusLocation,
  toLocation: CampusLocation
): NavigationRoute | null {
  if (fromLocation.id === toLocation.id) {
    return null;
  }

  const startNode = getNodeForLocation(fromLocation);
  const targetNode = getNodeForLocation(toLocation);

  // If start point or destination is off-campus (> 120m from any campus node),
  // NEVER invent an aerial direct line cutting across town and buildings!
  const distToStartNode = getDistanceMeters(fromLocation.coordinates, startNode.coordinates);
  if (distToStartNode > 120) {
    return null;
  }
  const distToTargetNode = getDistanceMeters(toLocation.coordinates, targetNode.coordinates);
  if (distToTargetNode > 120) {
    return null;
  }

  // Build Adjacency List (undirected graph for walkable roads)
  const adjacency: Record<string, { to: string; distance: number; path: [number, number][] }[]> = {};
  for (const node of CAMPUS_NODES) {
    adjacency[node.id] = [];
  }

  for (const edge of CAMPUS_EDGES) {
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    if (!adjacency[edge.to]) adjacency[edge.to] = [];

    // Forward edge
    adjacency[edge.from].push({
      to: edge.to,
      distance: edge.distanceMeters,
      path: edge.pathCoordinates
    });
    // Reverse edge (reversed polyline)
    adjacency[edge.to].push({
      to: edge.from,
      distance: edge.distanceMeters,
      path: [...edge.pathCoordinates].reverse()
    });
  }

  // Ensure all campus nodes are connected so graph is never disconnected
  for (const node of CAMPUS_NODES) {
    if (!adjacency[node.id] || adjacency[node.id].length === 0) {
      let closestNode: RouteNode | null = null;
      let minD = Infinity;
      for (const other of CAMPUS_NODES) {
        if (other.id !== node.id && adjacency[other.id] && adjacency[other.id].length > 0) {
          const d = getDistanceMeters(node.coordinates, other.coordinates);
          if (d < minD) {
            minD = d;
            closestNode = other;
          }
        }
      }
      if (closestNode) {
        if (!adjacency[node.id]) adjacency[node.id] = [];
        adjacency[node.id].push({
          to: closestNode.id,
          distance: minD,
          path: [node.coordinates, closestNode.coordinates],
        });
        adjacency[closestNode.id].push({
          to: node.id,
          distance: minD,
          path: [closestNode.coordinates, node.coordinates],
        });
      }
    }
  }

  // Priority Queue / Dijkstra setup
  const distances: Record<string, number> = {};
  const previousNode: Record<string, string | null> = {};
  const previousEdgePath: Record<string, [number, number][]> = {};
  const unvisited = new Set<string>();

  for (const node of CAMPUS_NODES) {
    distances[node.id] = Infinity;
    previousNode[node.id] = null;
    unvisited.add(node.id);
  }

  distances[startNode.id] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (!currentId || distances[currentId] === Infinity) {
      break; // No reachable node
    }

    if (currentId === targetNode.id) {
      break; // Reached target
    }

    unvisited.delete(currentId);

    const neighbors = adjacency[currentId] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = distances[currentId] + neighbor.distance;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previousNode[neighbor.to] = currentId;
        previousEdgePath[neighbor.to] = neighbor.path;
      }
    }
  }

  // If targetNode is still unreachable, bridge to closest reachable backbone node
  if (distances[targetNode.id] === Infinity) {
    let bestBridgeNode: string | null = null;
    let bestDist = Infinity;
    for (const nodeId of Object.keys(distances)) {
      if (distances[nodeId] < Infinity) {
        const d = getDistanceMeters(targetNode.coordinates, (CAMPUS_NODES.find(n => n.id === nodeId) || targetNode).coordinates);
        if (d < bestDist) {
          bestDist = d;
          bestBridgeNode = nodeId;
        }
      }
    }
    if (bestBridgeNode) {
      previousNode[targetNode.id] = bestBridgeNode;
      const bridgeObj = CAMPUS_NODES.find(n => n.id === bestBridgeNode);
      previousEdgePath[targetNode.id] = bridgeObj ? [bridgeObj.coordinates, targetNode.coordinates] : [];
    }
  }

  // Reconstruct Node Path and Polylines
  const nodeSequence: string[] = [];
  let curr: string | null = targetNode.id;
  while (curr) {
    nodeSequence.unshift(curr);
    curr = previousNode[curr];
  }

  // Assemble a continuous high-resolution polyline.
  // IMPORTANT: the old implementation jumped from the GPS point directly to
  // the SECOND point of the first road edge. That could draw a line across
  // buildings and make the first direction look reversed/wrong. Always keep
  // the start node in the polyline, then connect the final road node to the
  // exact destination entrance coordinate.
  const fullPolyline: [number, number][] = [];

  const pushPoint = (point: [number, number]) => {
    const last = fullPolyline[fullPolyline.length - 1];
    if (!last || getDistanceMeters(last, point) > 1) {
      fullPolyline.push(point);
    }
  };

  // Exact origin -> nearest graph node. This is intentionally explicit so
  // live GPS navigation never skips the node it is supposed to approach.
  pushPoint(fromLocation.coordinates);
  pushPoint(startNode.coordinates);

  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const toId = nodeSequence[i + 1];
    const edgePath = previousEdgePath[toId];
    if (edgePath && edgePath.length > 0) {
      for (const point of edgePath) pushPoint(point);
    }
  }

  // Road node -> exact destination coordinate. The location coordinate is
  // treated as the destination/entrance, not as a road node.
  pushPoint(toLocation.coordinates);

  // Generate Turn-by-Turn Navigation Steps
  const steps: NavigationStep[] = [];
  let totalDistance = 0;

  // Step 1: Start
  const startStepDist = Math.round(getDistanceMeters(fullPolyline[0], fullPolyline[1] || fullPolyline[0]));
  const startDistStr = startStepDist > 0 ? `${startStepDist} m` : '10 m';
  const startDistHi = startStepDist > 0 ? `${startStepDist} मी.` : '10 मी.';

  steps.push({
    instructionEn: `Head straight for ${startDistStr} towards ${startNode.name}`,
    instructionHi: `${startDistHi} सीधे आगे बढ़ें, ${startNode.name} की दिशा में`,
    distanceMeters: startStepDist || 50,
    durationSeconds: Math.round((startStepDist || 50) / 1.3),
    action: 'straight',
    landmarkName: startNode.name,
    coordinates: fullPolyline[0]
  });
  totalDistance += (startStepDist || 50);

  let lastBearing = calculateBearing(fullPolyline[0], fullPolyline[1] || fullPolyline[0]);

  // Intermediate turns for key nodes along the route
  for (let i = 1; i < nodeSequence.length - 1; i++) {
    const currNodeObj = CAMPUS_NODES.find((n) => n.id === nodeSequence[i])!;
    const nextNodeObj = CAMPUS_NODES.find((n) => n.id === nodeSequence[i + 1])!;
    const currentBearing = calculateBearing(currNodeObj.coordinates, nextNodeObj.coordinates);
    const turn = getTurnAction(lastBearing, currentBearing);
    const rawDist = getDistanceMeters(currNodeObj.coordinates, nextNodeObj.coordinates);
    const segmentDist = Math.max(20, Math.round(rawDist / 5) * 5); // Round to clean multiples of 5m (e.g. 50m, 65m, 80m)

    let enInstruction = '';
    let hiInstruction = '';
    if (turn.action === 'straight') {
      enInstruction = `Continue straight for ${segmentDist} m towards ${nextNodeObj.name}`;
      hiInstruction = `${segmentDist} मी. सीधे आगे चलें, ${nextNodeObj.name} की ओर`;
    } else {
      enInstruction = `In ${segmentDist} m, ${turn.en.toLowerCase()} towards ${nextNodeObj.name}`;
      hiInstruction = `${segmentDist} मी. के बाद ${turn.hi}, ${nextNodeObj.name} की ओर`;
    }

    steps.push({
      instructionEn: enInstruction,
      instructionHi: hiInstruction,
      distanceMeters: segmentDist,
      durationSeconds: Math.round(segmentDist / 1.3),
      action: turn.action,
      landmarkName: currNodeObj.name,
      coordinates: currNodeObj.coordinates
    });
    totalDistance += segmentDist;
    lastBearing = currentBearing;
  }

  // Final Step: Arrival
  const rawFinalDist = Math.round(getDistanceMeters(fullPolyline[fullPolyline.length - 2] || fullPolyline[0], toLocation.coordinates));
  const finalDistance = Math.max(10, Math.round(rawFinalDist / 5) * 5);
  totalDistance += finalDistance;

  steps.push({
    instructionEn: `In ${finalDistance} m, arrive at destination: ${toLocation.title}${toLocation.floor ? ` (${toLocation.floor})` : ''}`,
    instructionHi: `${finalDistance} मी. में गंतव्य पर पहुंचेंगे: ${toLocation.hindiTitle}${toLocation.floor ? ` (${toLocation.floor})` : ''}`,
    distanceMeters: finalDistance,
    durationSeconds: Math.round(finalDistance / 1.3),
    action: 'arrive',
    landmarkName: toLocation.title,
    coordinates: toLocation.coordinates
  });

  // Realistic campus travel times:
  // Walking: ~1.25 m/s (~75 m/min)
  // Bicycle: ~4.0 m/s (~240 m/min, ~3x faster than walking)
  const totalTimeWalking = Math.max(1, Math.round(totalDistance / (1.25 * 60)));
  const calculatedBicycle = Math.max(1, Math.round(totalDistance / (4.0 * 60)));
  // Strict guarantee: Cycling can NEVER take more time than walking
  const totalTimeBicycle = Math.max(1, Math.min(calculatedBicycle, Math.max(1, Math.ceil(totalTimeWalking / 2.5))));

  return {
    path: fullPolyline,
    steps,
    totalDistanceMeters: totalDistance,
    totalTimeMinutesWalking: totalTimeWalking,
    totalTimeMinutesBicycle: totalTimeBicycle,
    fromLocation,
    toLocation
  };
}


/**
 * Road-first routing using high-availability pedestrian and road networks (OSRM & OpenStreetMap).
 * This fetches real paved roads, street curves, roundabouts, and walkways from the user's
 * exact live location to the campus entrance and destination, eliminating straight "displacement" cuts.
 */
export async function calculateRoadRoute(
  fromLocation: CampusLocation,
  toLocation: CampusLocation
): Promise<NavigationRoute | null> {
  const [fromLat, fromLng] = fromLocation.coordinates;
  const [toLat, toLng] = toLocation.coordinates;

  // Fallback quickly for obviously invalid coordinates.
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null;

  // Real road endpoints to try in sequence:
  // 1. High-availability Server Route Proxy (Foot / Pedestrian)
  // 2. High-availability Server Route Proxy (Driving / Major thoroughfares)
  // 3. Fallback direct public mirrors (OSRM Foot, OSM Foot, OSRM Driving, OSM Car)
  const candidateUrls = [
    `/api/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}&mode=foot`,
    `/api/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}&mode=driving`,
    `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`,
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`,
    `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`
  ];

  for (const url of candidateUrls) {
    const isLocalProxy = url.startsWith('/api/');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), isLocalProxy ? 4500 : 3800);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      window.clearTimeout(timeout);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) continue;

      const rawRoute = data.routes[0];
      const rawCoords = rawRoute.geometry.coordinates as [number, number][];
      // Convert [lng, lat] from GeoJSON to [lat, lng] for Leaflet
      const path: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

      // Seamlessly connect the live origin and destination if first/last road node is within reasonable walking distance
      if (path.length > 0) {
        const distToStart = getDistanceMeters(fromLocation.coordinates, path[0]);
        if (distToStart > 1 && distToStart < 250) {
          path.unshift(fromLocation.coordinates);
        }
        const distToEnd = getDistanceMeters(path[path.length - 1], toLocation.coordinates);
        if (distToEnd > 1 && distToEnd < 250) {
          path.push(toLocation.coordinates);
        }
      }

      const steps: NavigationStep[] = [];
      const rawSteps = rawRoute.legs?.[0]?.steps || [];

      for (const step of rawSteps) {
        const distance = Math.max(0, Math.round(step.distance || 0));
        if (distance < 2) continue;

        const maneuver = step.maneuver || {};
        const modifier = maneuver.modifier || '';
        const type = maneuver.type || '';
        let action: NavigationStep['action'] = 'straight';
        let en = 'Continue straight';
        let hi = 'सीधे आगे बढ़ें';

        if (type === 'arrive') {
          action = 'arrive';
          en = `Arrive at ${toLocation.title}`;
          hi = `${toLocation.hindiTitle} पर पहुंच गए`;
        } else if (modifier.includes('left')) {
          action = modifier === 'slight left' ? 'slight-left' : 'turn-left';
          en = modifier === 'slight left' ? 'Take a slight left' : 'Turn left';
          hi = modifier === 'slight left' ? 'हल्के बाएं मुड़ें' : 'बाएं मुड़ें';
        } else if (modifier.includes('right')) {
          action = modifier === 'slight right' ? 'slight-right' : 'turn-right';
          en = modifier === 'slight right' ? 'Take a slight right' : 'Turn right';
          hi = modifier === 'slight right' ? 'हल्के दाएं मुड़ें' : 'दाएं मुड़ें';
        }

        const roadName = step.name ? ` on ${step.name}` : '';
        if (action === 'straight') {
          en = `Continue straight for ${distance} m${roadName}`;
          hi = `${distance} मी. सीधे आगे बढ़ें${step.name ? `, ${step.name} पर` : ''}`;
        } else if (action !== 'arrive') {
          en = `${en} for ${distance} m${roadName}`;
          hi = `${distance} मी. ${hi}${step.name ? `, ${step.name} पर` : ''}`;
        }

        const location: [number, number] = maneuver.location
          ? [maneuver.location[1], maneuver.location[0]]
          : path[Math.min(steps.length, path.length - 1)];

        steps.push({
          instructionEn: en,
          instructionHi: hi,
          distanceMeters: distance,
          durationSeconds: Math.round(step.duration || distance / 1.3),
          action,
          coordinates: location,
          landmarkName: step.name || toLocation.title,
        });
      }

      if (steps.length === 0 || steps[steps.length - 1].action !== 'arrive') {
        steps.push({
          instructionEn: `Arrive at ${toLocation.title}`,
          instructionHi: `${toLocation.hindiTitle} पर पहुंच गए`,
          distanceMeters: 0,
          durationSeconds: 0,
          action: 'arrive',
          coordinates: toLocation.coordinates,
          landmarkName: toLocation.title,
        });
      }

      const totalDistance = Math.round(
        rawRoute.distance || getDistanceMeters(fromLocation.coordinates, toLocation.coordinates)
      );

      // Compute realistic walking and cycling times.
      // Do not use rawRoute.duration directly as it may represent driving duration if the driving fallback was used.
      const totalTimeWalking = Math.max(1, Math.round(totalDistance / (1.25 * 60)));
      const calculatedBicycle = Math.max(1, Math.round(totalDistance / (4.0 * 60)));
      const totalTimeBicycle = Math.max(1, Math.min(calculatedBicycle, Math.max(1, Math.ceil(totalTimeWalking / 2.5))));

      return {
        path,
        steps,
        totalDistanceMeters: totalDistance,
        totalTimeMinutesWalking: totalTimeWalking,
        totalTimeMinutesBicycle: totalTimeBicycle,
        fromLocation,
        toLocation,
      };
    } catch {
      window.clearTimeout(timeout);
      continue;
    }
  }

  return null;
}

export const findCampusRoute = calculateCampusRoute;

export function calculateRoute(
  startCoord: [number, number],
  destCoord: [number, number],
  nodes: RouteNode[],
  edges: any[],
  fromTitle: string,
  toTitle: string
): NavigationRoute | null {
  const mockFrom: CampusLocation = {
    id: 'nav-from',
    title: fromTitle,
    hindiTitle: fromTitle,
    category: 'gate',
    coordinates: startCoord,
    block: 'Campus',
    description: `Starting from ${fromTitle}`,
  };

  const mockTo: CampusLocation = {
    id: 'nav-to',
    title: toTitle,
    hindiTitle: toTitle,
    category: 'department',
    coordinates: destCoord,
    block: 'Campus',
    description: `Destination ${toTitle}`,
  };

  return calculateCampusRoute(mockFrom, mockTo);
}

