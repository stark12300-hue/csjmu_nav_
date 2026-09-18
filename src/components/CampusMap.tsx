import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { CampusLocation, Language, MapStyle, NavigationRoute, TeacherAccount } from '../types';
import { CSJMU_CENTER, CAMPUS_BOUNDS } from '../data/csjmuCampusData';
import { TRANSLATIONS } from '../translations';
import { Move, Navigation2, Lock, Maximize2, Crosshair, MapPin, CheckCircle2, X, Compass } from 'lucide-react';
import { calculateBearing, getDestinationCoordinate, getDistanceMeters } from '../utils/pathfinding';

interface CampusMapProps {
  locations: CampusLocation[];
  selectedLocation: CampusLocation | null;
  onSelectLocation: (loc: CampusLocation) => void;
  navigationRoute: NavigationRoute | null;
  mapStyle: MapStyle;
  isPickingLocation: boolean;
  pickedCoordinates: [number, number] | null;
  onPickCoordinates: (coords: [number, number]) => void;
  onCancelPick?: () => void;
  userCoordinates: [number, number] | null;
  language: Language;
  onStartNavigationTo: (loc: CampusLocation) => void;
  isAdminMode?: boolean;
  isDragUnlocked?: boolean;
  isTeacherDragUnlocked?: boolean;
  onDisableDrag?: () => void;
  onUpdateLocationCoordinates?: (id: string, coords: [number, number]) => void;
  onDeleteLocation?: (id: string) => void;
  onExitAdminMode?: () => void;
  focusCoordinates?: [number, number] | null;
  loggedInTeacher?: TeacherAccount | null;
  isLiveNavActive?: boolean;
  activeLiveNavStepIdx?: number;
  userHeading?: number | null;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  navigationRoute,
  mapStyle,
  isPickingLocation,
  pickedCoordinates,
  onPickCoordinates,
  onCancelPick,
  userCoordinates,
  language,
  onStartNavigationTo,
  isAdminMode = false,
  isDragUnlocked = false,
  isTeacherDragUnlocked = false,
  onDisableDrag,
  onUpdateLocationCoordinates,
  onDeleteLocation,
  onExitAdminMode,
  focusCoordinates,
  loggedInTeacher = null,
  isLiveNavActive = false,
  activeLiveNavStepIdx = 0,
  userHeading = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeOutlineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const pickMarkerRef = useRef<L.Marker | null>(null);
  const lastFittedRouteKeyRef = useRef<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [tentativePick, setTentativePick] = useState<[number, number] | null>(pickedCoordinates || null);
  const t = TRANSLATIONS[language];

  // Live Navigation Google Maps Camera, Rotation & Orientation States
  const [isHeadingUpMode, setIsHeadingUpMode] = useState<boolean>(true);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
  const userInteractionTimeoutRef = useRef<number | null>(null);
  const prevBearingRef = useRef<number>(0);
  const isLiveNavActiveRef = useRef(isLiveNavActive);

  useEffect(() => {
    isLiveNavActiveRef.current = isLiveNavActive;
  }, [isLiveNavActive]);

  // Ref locks to avoid stale closures in Leaflet events
  const onPickCoordinatesRef = useRef(onPickCoordinates);
  const isPickingLocationRef = useRef(isPickingLocation);

  useEffect(() => {
    onPickCoordinatesRef.current = onPickCoordinates;
    isPickingLocationRef.current = isPickingLocation;
  }, [onPickCoordinates, isPickingLocation]);

  // Sync tentative coordinates when picking mode opens or pickedCoordinates prop changes
  useEffect(() => {
    if (isPickingLocation) {
      if (pickedCoordinates) {
        setTentativePick(pickedCoordinates);
      }
    } else {
      setTentativePick(null);
    }
  }, [isPickingLocation, pickedCoordinates]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CSJMU_CENTER,
      zoom: 16,
      minZoom: 10,
      maxZoom: 20,
      maxBounds: [
        [26.2, 80.0],
        [26.8, 80.6],
      ],
      zoomControl: false,
    });

    // Add zoom control at bottom right (placed nicely)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Marker Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    const updateZoomTier = (z: number) => {
      const container = mapContainerRef.current;
      if (!container) return;
      if (z < 15.2) {
        container.setAttribute('data-zoom-tier', 'low');
      } else if (z < 16.5) {
        container.setAttribute('data-zoom-tier', 'mid');
      } else {
        container.setAttribute('data-zoom-tier', 'high');
      }
    };

    updateZoomTier(16);

    map.on('zoom zoomend', () => {
      const z = map.getZoom();
      setCurrentZoom(z);
      updateZoomTier(z);
    });

    // Detect when user manually pans/drags map during live navigation
    map.on('dragstart', () => {
      if (isLiveNavActiveRef.current) {
        setIsUserInteracting(true);
        if (userInteractionTimeoutRef.current) {
          window.clearTimeout(userInteractionTimeoutRef.current);
        }
        // Auto-re-center after 12 seconds of inactivity
        userInteractionTimeoutRef.current = window.setTimeout(() => {
          setIsUserInteracting(false);
        }, 12000);
      }
    });

    // Click handler for picking coordinate (only active when explicitly picking a location)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isPickingLocationRef.current) {
        const latLng: [number, number] = [e.latlng.lat, e.latlng.lng];
        setTentativePick(latLng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer based on Map Style
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Maps &copy; OpenStreetMap contributors';
    let maxZoom = 20;

    if (mapStyle === 'satellite') {
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps Imagery';
      maxZoom = 20;
    } else if (mapStyle === 'clean') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; CARTO &copy; OpenStreetMap';
      maxZoom = 19;
    } else {
      // Default / Streets: Official Google Maps Light Vector tiles
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps &copy; OpenStreetMap contributors';
      maxZoom = 20;
    }

    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapStyle]);

  // Render Location Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // When navigation route is active, ONLY show destination marker (and start marker if not GPS)
    // so the map screen is completely clean and only the route and destination are visible!
    const activeRouteDestId = navigationRoute?.toLocation?.id;
    const activeRouteStartId = navigationRoute?.fromLocation?.id;

    // When zoomed out far (currentZoom < 15.2):
    // Show only prominent landmark hubs so the overview map stays uncluttered
    const isMajorLandmark = (loc: CampusLocation) => {
      const id = loc.id.toLowerCase();
      const cat = loc.category;
      return (
        cat === 'gate' ||
        cat === 'admin' ||
        cat === 'library' ||
        id.includes('gate') ||
        id.includes('admin') ||
        id.includes('library') ||
        id.includes('uiet') ||
        id.includes('hospital') ||
        id.includes('health') ||
        id.includes('stadium') ||
        id.includes('auditorium') ||
        loc.id === activeRouteDestId ||
        loc.id === activeRouteStartId ||
        loc.id === selectedLocation?.id ||
        Boolean(loc.isCustom)
      );
    };

    const visibleLocations = navigationRoute
      ? locations.filter(
          (loc) =>
            loc.id === activeRouteDestId ||
            (loc.id === activeRouteStartId && loc.id !== 'user-current-gps')
        )
      : currentZoom < 15.2
      ? locations.filter(isMajorLandmark)
      : locations;

    visibleLocations.forEach((loc) => {
      if (!loc || !Array.isArray(loc.coordinates) || loc.coordinates.length < 2) return;
      const lat = Number(loc.coordinates[0]);
      const lng = Number(loc.coordinates[1]);
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;
      const safeCoordinates: [number, number] = [lat, lng];

      const isDestination = navigationRoute && loc.id === activeRouteDestId;
      const isStartPoint = navigationRoute && loc.id === activeRouteStartId;
      const isSelected = selectedLocation?.id === loc.id;
      const title = language === 'hi' ? loc.hindiTitle : loc.title;
      const isCustom = !!loc.isCustom;

      // Color theme based on category or route status
      let badgeBg = 'bg-blue-600';
      let categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`;

      if (isDestination) {
        badgeBg = 'bg-rose-600';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
      } else if (isStartPoint) {
        badgeBg = 'bg-emerald-600';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>`;
      } else if (loc.category === 'department') {
        badgeBg = 'bg-indigo-600';
      } else if (loc.category === 'admin') {
        badgeBg = 'bg-slate-700';
      } else if (loc.category === 'faculty') {
        badgeBg = 'bg-violet-600';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
      } else if (loc.category === 'lab') {
        badgeBg = 'bg-teal-600';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`;
      } else if (loc.category === 'library') {
        badgeBg = 'bg-emerald-600';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`;
      } else if (loc.category === 'canteen') {
        badgeBg = 'bg-rose-500';
        categoryIconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a1 1 0 00-1-1H7a1 1 0 00-1 1v4m6 0H6m6 0h6a1 1 0 001-1V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4"/></svg>`;
      } else if (loc.category === 'sports') {
        badgeBg = 'bg-lime-600';
      } else if (loc.category === 'hostel') {
        badgeBg = 'bg-rose-600';
      } else if (loc.category === 'gate') {
        badgeBg = 'bg-sky-600';
      } else if (loc.category === 'facility') {
        badgeBg = 'bg-cyan-600';
      } else if (loc.category === 'custom_student') {
        badgeBg = 'bg-purple-600';
      }

      const isDraggable = !!(isDragUnlocked || isTeacherDragUnlocked);
      const isOwnerTeacher = Boolean(
        loggedInTeacher &&
        (loc.teacherId === loggedInTeacher.id ||
         (loc.isCustom && loc.addedBy && loc.addedBy.includes(loggedInTeacher.name)))
      );

      const markerRotationStyle = isLiveNavActive && isHeadingUpMode ? `transform: rotate(${currentBearing}deg);` : '';

      const customHtml = `
        <div id="marker-${loc.id}" class="group relative flex flex-col items-center ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } transition-transform duration-200 ${
        isDestination ? 'scale-125 z-50' : isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'
      }" style="${markerRotationStyle}">
          <div class="flex items-center justify-center ${isDestination ? 'w-9 h-9' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-full ${badgeBg} border-2 ${
        isDestination
          ? 'border-white ring-4 ring-rose-500/60 shadow-xl shadow-rose-950/80 animate-bounce'
          : isSelected
          ? 'border-blue-500 ring-4 ring-blue-400/50 animate-bounce'
          : 'border-white/90 shadow-lg shadow-black/40'
      } ${isDraggable ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black/50' : ''}">
            ${
              isDraggable
                ? `<svg class="w-4 h-4 text-emerald-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 9l4-4 4 4m0 6l-4 4-4-4M5 12h14"/></svg>`
                : categoryIconSvg
            }
          </div>
          ${
            isDraggable
              ? `<span class="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-emerald-500 text-[9px] font-black text-black border border-white rounded-full shadow-sm">DRAG</span>`
              : ''
          }
          <div class="mt-1 ios-marker-name-pill ${
            isDestination
              ? 'destination'
              : isStartPoint
              ? 'startpoint'
              : isSelected
              ? 'selected'
              : ''
          } ${isDraggable ? 'active-drag ring-1.5 ring-emerald-500/80 !text-emerald-950 font-black' : ''} pointer-events-none transition-all ${
            isSelected || isDestination || isStartPoint ? 'is-prominent scale-105' : ''
          }">
            <span class="truncate">${isDestination ? `🎯 ${title}` : isStartPoint ? `🟢 ${title}` : title}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-campus-marker',
        html: customHtml,
        iconSize: [32, 48],
        iconAnchor: [16, 16],
        popupAnchor: [0, -22],
      });

      const marker = L.marker(safeCoordinates, {
        icon: customIcon,
        draggable: isDraggable,
        autoPan: isDraggable,
      });

      if (isDraggable) {
        marker.on('dragstart', () => {
          marker.closePopup();
          try {
            map.closePopup();
          } catch {}
        });

        marker.on('dragend', (e: any) => {
          const latLng = e.target.getLatLng();
          const newCoords: [number, number] = [
            parseFloat(latLng.lat.toFixed(6)),
            parseFloat(latLng.lng.toFixed(6)),
          ];
          try {
            map.closePopup();
          } catch {}
          if (onUpdateLocationCoordinates) {
            onUpdateLocationCoordinates(loc.id, newCoords);
          }
        });
      }

      // Popup with mini info
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-zinc-900 font-sans';
      popupContent.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-6 h-6 rounded-lg ${badgeBg} flex items-center justify-center shrink-0 shadow-xs">
            ${categoryIconSvg}
          </div>
          <div class="font-black text-xs sm:text-sm text-zinc-950 truncate">${title}</div>
        </div>
        <div class="text-[11px] text-zinc-600 mt-1 leading-snug">${
          language === 'hi' ? loc.hindiDescription || loc.description : loc.description
        }</div>
        ${
          loc.floor
            ? `<div class="mt-1.5 inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-full border border-blue-200/80">${loc.floor}</div>`
            : ''
        }
        <div class="mt-2.5 flex flex-col gap-1.5">
          <div class="flex gap-1.5">
            <button id="btn-popup-nav-${loc.id}" class="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-full transition shadow-sm text-center flex items-center justify-center gap-1 cursor-pointer">
              <span>🧭</span>
              <span>${t.navigateHere}</span>
            </button>
            <button id="btn-popup-details-${loc.id}" class="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-900 text-xs font-bold rounded-full border border-zinc-200 transition text-center cursor-pointer">
              ${t.buildingInfo}
            </button>
          </div>
          ${
            isDraggable && onDisableDrag
              ? `<button id="btn-popup-turn-off-drag-${loc.id}" class="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-black rounded-xl transition text-center flex items-center justify-center gap-1 mt-0.5 cursor-pointer">
                  <span>🔒 ${language === 'hi' ? 'ड्रैग बंद करें (Lock Pin)' : 'Turn Drag Off (Lock Pin)'}</span>
                </button>`
              : ''
          }
          ${
            (isAdminMode || isOwnerTeacher) && onDeleteLocation
              ? `<button id="btn-popup-del-${loc.id}" class="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer">
                  <span>🗑️ ${
                    isOwnerTeacher && !isAdminMode
                      ? (language === 'hi' ? 'मेरा स्थान हटाएं (Delete)' : 'Delete Your Marker')
                      : (language === 'hi' ? 'स्थान हटाएं (Delete)' : 'Delete Marker')
                  }</span>
                </button>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 260 });

      marker.on('click', () => {
        if (isPickingLocationRef.current) {
          setTentativePick([loc.coordinates[0], loc.coordinates[1]]);
          return;
        }
        onSelectLocation(loc);
      });

      marker.on('popupopen', () => {
        const navBtn = document.getElementById(`btn-popup-nav-${loc.id}`);
        const detailsBtn = document.getElementById(`btn-popup-details-${loc.id}`);
        const delBtn = document.getElementById(`btn-popup-del-${loc.id}`);
        const dragOffBtn = document.getElementById(`btn-popup-turn-off-drag-${loc.id}`);
        if (navBtn) {
          navBtn.onclick = (e) => {
            e.stopPropagation();
            onStartNavigationTo(loc);
            marker.closePopup();
          };
        }
        if (detailsBtn) {
          detailsBtn.onclick = (e) => {
            e.stopPropagation();
            onSelectLocation(loc);
            marker.closePopup();
          };
        }
        if (dragOffBtn && onDisableDrag) {
          dragOffBtn.onclick = (e) => {
            e.stopPropagation();
            onDisableDrag();
            marker.closePopup();
          };
        }
        if (delBtn && onDeleteLocation) {
          delBtn.onclick = (e) => {
            e.stopPropagation();
            const confirmMsg =
              isOwnerTeacher && !isAdminMode
                ? language === 'hi'
                  ? `क्या आप वाकई अपने द्वारा जोड़े गए स्थान "${loc.hindiTitle || loc.title}" को हटाना चाहते हैं?`
                  : `Are you sure you want to delete your added location "${loc.title}"?`
                : language === 'hi'
                ? `क्या आप वाकई "${loc.hindiTitle || loc.title}" को हटाना चाहते हैं?`
                : `Delete "${loc.title}" from campus map?`;
            if (window.confirm(confirmMsg)) {
              onDeleteLocation(loc.id);
              marker.closePopup();
            }
          };
        }
      });

      marker.addTo(markersGroup);
    });
  }, [
    locations,
    selectedLocation,
    language,
    isAdminMode,
    isDragUnlocked,
    isTeacherDragUnlocked,
    loggedInTeacher,
    onDisableDrag,
    onUpdateLocationCoordinates,
    onDeleteLocation,
    navigationRoute,
    currentZoom,
  ]);

  // Fit bounds helper to center and zoom in on the entire route
  const handleFitRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || !navigationRoute || navigationRoute.path.length === 0) return;
    try {
      const bounds = L.latLngBounds(navigationRoute.path);
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, 110],
        maxZoom: 18,
        animate: true,
        duration: 0.9,
      });
    } catch (err) {
      console.warn('fitBounds error:', err);
    }
  };

  // Draw Navigation Polyline and Zoom into Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (routeOutlineRef.current) {
      map.removeLayer(routeOutlineRef.current);
      routeOutlineRef.current = null;
    }

    if (navigationRoute && navigationRoute.path.length > 0) {
      // Glow / Outline
      const outline = L.polyline(navigationRoute.path, {
        color: '#1e3a8a',
        weight: 8,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routeOutlineRef.current = outline;

      // Active vibrant route line
      const line = L.polyline(navigationRoute.path, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      routeLayerRef.current = line;

      // Automatically zoom in on the route when calculated or route endpoints change
      const routeKey = `${navigationRoute.fromLocation?.id || ''}->${navigationRoute.toLocation?.id || ''}`;
      if (lastFittedRouteKeyRef.current !== routeKey) {
        lastFittedRouteKeyRef.current = routeKey;
        if (!isLiveNavActive) {
          const bounds = L.latLngBounds(navigationRoute.path);
          map.fitBounds(bounds, {
            paddingTopLeft: [40, 80],
            paddingBottomRight: [40, 110],
            maxZoom: 18,
            animate: true,
            duration: 1.0,
          });
        }
      }
    } else {
      lastFittedRouteKeyRef.current = null;
    }
  }, [navigationRoute, isLiveNavActive]);

  // Determine current active coordinate for live navigation camera tracking
  const activeNavCoord = useMemo<[number, number]>(() => {
    if (userCoordinates && Array.isArray(userCoordinates) && userCoordinates.length >= 2) {
      return userCoordinates;
    }
    if (navigationRoute && navigationRoute.steps && navigationRoute.steps[activeLiveNavStepIdx]) {
      return navigationRoute.steps[activeLiveNavStepIdx].coordinates;
    }
    if (navigationRoute && navigationRoute.path && navigationRoute.path.length > 0) {
      return navigationRoute.path[0];
    }
    return CSJMU_CENTER;
  }, [userCoordinates, navigationRoute, activeLiveNavStepIdx]);

  // Compute direction / bearing along road or from device compass
  const targetBearing = useMemo<number>(() => {
    if (!isLiveNavActive || !navigationRoute) return 0;

    // 1. If device GPS heading is available from movement (> 0)
    if (userHeading !== null && userHeading !== undefined && !isNaN(userHeading) && userHeading >= 0) {
      return userHeading;
    }

    // 2. Compute road heading towards the next point along the route path
    if (navigationRoute.path && navigationRoute.path.length >= 2) {
      let closestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < navigationRoute.path.length; i++) {
        const d = getDistanceMeters(activeNavCoord, navigationRoute.path[i]);
        if (d < minD) {
          minD = d;
          closestIdx = i;
        }
      }

      for (let i = closestIdx + 1; i < navigationRoute.path.length; i++) {
        const d = getDistanceMeters(activeNavCoord, navigationRoute.path[i]);
        if (d >= 14) {
          return calculateBearing(activeNavCoord, navigationRoute.path[i]);
        }
      }
    }

    // 3. Next step coordinate if available
    const nextStep = navigationRoute.steps[activeLiveNavStepIdx + 1];
    if (nextStep) {
      return calculateBearing(activeNavCoord, nextStep.coordinates);
    }

    return prevBearingRef.current || 0;
  }, [isLiveNavActive, navigationRoute, userHeading, activeNavCoord, activeLiveNavStepIdx]);

  // Interpolate angle transitions using shortest angular distance
  useEffect(() => {
    if (!isLiveNavActive) {
      setCurrentBearing(0);
      prevBearingRef.current = 0;
      return;
    }

    const prev = prevBearingRef.current;
    let diff = (targetBearing - prev) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    const nextBearing = prev + diff;
    prevBearingRef.current = nextBearing;
    setCurrentBearing(nextBearing);
  }, [targetBearing, isLiveNavActive]);

  // Live Navigation Google Maps Camera Tracking: High zoom (19.2) & move forward with direction
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLiveNavActive || isUserInteracting) return;

    try {
      map.invalidateSize({ animate: false });

      // In Heading-Up mode, offset camera forward along travel direction by 26m
      // so user GPS arrow sits at ~65% Y from top, giving wide forward visibility right below live HUD!
      const effectiveBearing = isHeadingUpMode ? currentBearing : 0;
      const cameraCenter = isHeadingUpMode
        ? getDestinationCoordinate(activeNavCoord, 26, effectiveBearing)
        : activeNavCoord;

      const targetZoom = 19.2;

      if (map.getZoom() < 18.2) {
        // Initial entry into live navigation: fly in smoothly to high zoom
        map.flyTo(cameraCenter, targetZoom, {
          duration: 1.0,
          easeLinearity: 0.25,
        });
      } else {
        // Continuous live camera tracking as user moves
        map.panTo(cameraCenter, {
          animate: true,
          duration: 0.6,
          easeLinearity: 0.3,
        });
      }
    } catch (err) {
      console.warn('Live nav camera tracking error:', err);
    }
  }, [isLiveNavActive, activeNavCoord, currentBearing, isHeadingUpMode, isUserInteracting]);

  // Restore overview when live navigation exits
  const prevIsLiveNavActiveRef = useRef<boolean>(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (prevIsLiveNavActiveRef.current && !isLiveNavActive) {
      setIsUserInteracting(false);
      setCurrentBearing(0);
      prevBearingRef.current = 0;
      if (navigationRoute && navigationRoute.path.length > 0) {
        try {
          const bounds = L.latLngBounds(navigationRoute.path);
          map.fitBounds(bounds, {
            paddingTopLeft: [40, 80],
            paddingBottomRight: [40, 110],
            maxZoom: 18,
            animate: true,
            duration: 0.8,
          });
        } catch {}
      }
    }
    prevIsLiveNavActiveRef.current = !!isLiveNavActive;
  }, [isLiveNavActive, navigationRoute]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (userInteractionTimeoutRef.current) {
      window.clearTimeout(userInteractionTimeoutRef.current);
    }
    setIsUserInteracting(false);
    if (!map) return;
    try {
      const effectiveBearing = isHeadingUpMode ? currentBearing : 0;
      const cameraCenter = isHeadingUpMode
        ? getDestinationCoordinate(activeNavCoord, 26, effectiveBearing)
        : activeNavCoord;
      map.flyTo(cameraCenter, 19.2, {
        duration: 0.7,
        easeLinearity: 0.25,
      });
    } catch {}
  };

  // Center on Selected Location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocation) return;
    if (!Array.isArray(selectedLocation.coordinates) || selectedLocation.coordinates.length < 2) return;
    const lat = Number(selectedLocation.coordinates[0]);
    const lng = Number(selectedLocation.coordinates[1]);
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;

    try {
      map.invalidateSize({ animate: false });
      if (!navigationRoute && !isLiveNavActive) {
        map.flyTo([lat, lng], 17.5, { duration: 1.2 });
      }
    } catch (err) {
      console.warn('Map flyTo selectedLocation failed:', err);
    }
  }, [selectedLocation, navigationRoute, isLiveNavActive]);

  // Smooth Focus on specific coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusCoordinates || isLiveNavActive) return;
    if (!Array.isArray(focusCoordinates) || focusCoordinates.length < 2) return;
    const lat = Number(focusCoordinates[0]);
    const lng = Number(focusCoordinates[1]);
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;

    try {
      map.invalidateSize({ animate: false });
      map.flyTo([lat, lng], 18, { duration: 1.0 });
    } catch (err) {
      console.warn('Map flyTo focusCoordinates failed:', err);
    }
  }, [focusCoordinates, isLiveNavActive]);

  // User Current Live Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (userAccuracyCircleRef.current) {
      map.removeLayer(userAccuracyCircleRef.current);
      userAccuracyCircleRef.current = null;
    }

    const markerPos = userCoordinates || (isLiveNavActive ? activeNavCoord : null);
    const isNavMode = !!isLiveNavActive;

    if (markerPos) {
      if (!isNavMode) {
        const accuracyCircle = L.circle(markerPos, {
          radius: 20,
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
        userAccuracyCircleRef.current = accuracyCircle;
      }

      const arrowAngle = isHeadingUpMode ? 0 : currentBearing;

      const userIcon = L.divIcon({
        className: isNavMode ? 'google-maps-nav-chevron-marker' : 'user-gps-marker',
        html: isNavMode
          ? `
            <div class="relative flex items-center justify-center w-14 h-14 pointer-events-none">
              <!-- Directional forward spotlight cone projecting onto road -->
              <div class="absolute -top-7 w-16 h-16 bg-gradient-to-t from-blue-500/35 to-transparent rounded-t-full pointer-events-none ${
                isHeadingUpMode ? '' : 'transition-transform duration-300'
              }" style="${isHeadingUpMode ? '' : `transform: rotate(${arrowAngle}deg); transform-origin: center bottom;`}"></div>
              <!-- Pulse circle -->
              <div class="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-ping pointer-events-none"></div>
              <!-- 3D Navigation Chevron Disc -->
              <div class="relative w-10 h-10 rounded-full bg-white shadow-2xl border-2 border-white ring-4 ring-blue-500/40 flex items-center justify-center ${
                isHeadingUpMode ? '' : 'transition-transform duration-300'
              }" style="${isHeadingUpMode ? '' : `transform: rotate(${arrowAngle}deg);`}">
                <svg class="w-6 h-6 text-blue-600 drop-shadow-sm fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
                </svg>
              </div>
            </div>
          `
          : `
            <div class="relative flex items-center justify-center w-8 h-8">
              <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
              <div class="absolute w-6 h-6 rounded-full bg-sky-400/50 animate-pulse"></div>
              <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg shadow-blue-500/80 flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          `,
        iconSize: isNavMode ? [56, 56] : [32, 32],
        iconAnchor: isNavMode ? [28, 28] : [16, 16],
      });

      const userMarker = L.marker(markerPos, { icon: userIcon, zIndexOffset: 1200 })
        .bindTooltip(
          isNavMode
            ? language === 'hi'
              ? '🧭 लाइव नेविगेशन'
              : '🧭 Live Navigation'
            : language === 'hi'
            ? '📍 आपकी लोकेशन (Live GPS)'
            : '📍 Your Live GPS Location',
          {
            permanent: false,
            direction: 'top',
            className: 'native-maps-tooltip',
          }
        )
        .addTo(map);
      userMarkerRef.current = userMarker;
    }
  }, [userCoordinates, activeNavCoord, isLiveNavActive, isHeadingUpMode, currentBearing, language]);

  // Recalculate Leaflet size whenever container changes, modals toggle, or picker closes.
  // This completely prevents the map from rendering blank/black tiles on phone screens or after adding markers.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map) return;

    const invalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // ignore
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(invalidate);
      });
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', invalidate);
    document.addEventListener('visibilitychange', invalidate);

    const frame = window.requestAnimationFrame(invalidate);
    const timer1 = window.setTimeout(invalidate, 80);
    const timer2 = window.setTimeout(invalidate, 250);
    const timer3 = window.setTimeout(invalidate, 500);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', invalidate);
      document.removeEventListener('visibilitychange', invalidate);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
    };
  }, [isPickingLocation, locations.length]);

  // Find nearest campus location to tentative pick for context
  const nearestLocationToPick = useMemo(() => {
    if (!tentativePick) return null;
    let minDistance = Infinity;
    let closest: CampusLocation | null = null;
    for (const loc of locations) {
      const dist = Math.hypot(loc.coordinates[0] - tentativePick[0], loc.coordinates[1] - tentativePick[1]);
      if (dist < minDistance) {
        minDistance = dist;
        closest = loc;
      }
    }
    return closest;
  }, [tentativePick, locations]);

  // Manage interactive pick marker on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isPickingLocation || !tentativePick) {
      if (pickMarkerRef.current) {
        map.removeLayer(pickMarkerRef.current);
        pickMarkerRef.current = null;
      }
      return;
    }

    const pinHtml = `
      <div class="relative flex items-center justify-center pointer-events-none" style="transform: translate(-50%, -100%);">
        <div class="absolute -inset-2 rounded-full bg-emerald-500/35 animate-ping"></div>
        <div class="relative w-10 h-10 rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ring-emerald-400/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'custom-pick-pin',
      html: pinHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    if (pickMarkerRef.current) {
      pickMarkerRef.current.setLatLng(tentativePick);
    } else {
      pickMarkerRef.current = L.marker(tentativePick, { icon, zIndexOffset: 2500 }).addTo(map);
    }
  }, [isPickingLocation, tentativePick]);

  return (
    <div
      id="csjmu-map-container"
      className={`relative w-full h-full bg-[#E8ECEF] overflow-hidden ${
        isPickingLocation ? 'cursor-crosshair' : ''
      }`}
    >
      <div
        ref={mapContainerRef}
        data-zoom-tier="mid"
        className="w-full h-full z-0 bg-[#E8ECEF]"
        style={
          isLiveNavActive && isHeadingUpMode
            ? {
                transform: `scale(1.48) rotate(${-currentBearing}deg)`,
                transformOrigin: '50% 50%',
                transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
              }
            : {
                transform: 'scale(1) rotate(0deg)',
                transformOrigin: '50% 50%',
                transition: 'transform 0.5s ease-out',
              }
        }
      />

      {/* Google Maps Compass Button (Heading Up vs North Up) */}
      {isLiveNavActive && (
        <div
          id="live-nav-compass-control"
          className="absolute right-3.5 top-36 sm:top-28 z-40 pointer-events-auto animate-fade-in flex flex-col items-center gap-1.5"
        >
          <button
            type="button"
            id="btn-toggle-live-nav-compass"
            onClick={() => setIsHeadingUpMode((prev) => !prev)}
            className="w-11 h-11 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 rounded-full shadow-2xl border border-slate-200 flex items-center justify-center transition cursor-pointer"
            title={
              isHeadingUpMode
                ? language === 'hi'
                  ? 'उत्तर दिशा में लॉक करें (North Up)'
                  : 'Lock to North Up'
                : language === 'hi'
                ? 'रास्ते की दिशा में घुमाएं (Heading Up)'
                : 'Follow Direction (Heading Up)'
            }
          >
            {/* 3D Compass Needle Disc */}
            <div
              className="w-7 h-7 relative flex items-center justify-center transition-transform duration-500 ease-out"
              style={{
                transform: `rotate(${isHeadingUpMode ? currentBearing : 0}deg)`,
              }}
            >
              {/* Red North arrow tip */}
              <div className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[11px] border-b-rose-600"></div>
              {/* Silver South arrow tip */}
              <div className="absolute bottom-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[11px] border-t-slate-400"></div>
              {/* Center brass pivot */}
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-white z-10"></div>
            </div>
          </button>
          <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold rounded-full shadow-sm pointer-events-none">
            {isHeadingUpMode
              ? language === 'hi'
                ? 'दिशा मोड'
                : 'Heading'
              : language === 'hi'
              ? 'उत्तर (N)'
              : 'North (N)'}
          </span>
        </div>
      )}

      {/* Floating Re-center Button when user drags/pans away during Live Nav */}
      {isLiveNavActive && isUserInteracting && (
        <div
          id="live-nav-recenter-bar"
          className="absolute bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-fade-in"
        >
          <button
            type="button"
            id="btn-live-nav-recenter"
            onClick={handleRecenter}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-full shadow-2xl flex items-center gap-2 border-2 border-white cursor-pointer transition ios-press ring-4 ring-blue-500/20"
          >
            <Navigation2 className="w-4 h-4 fill-current text-white animate-pulse" />
            <span>{language === 'hi' ? 'पुनः केंद्र करें (Re-center)' : 'Re-center'}</span>
          </button>
        </div>
      )}

      {/* Floating Picking Prompt (Top HUD) */}
      {isPickingLocation && (
        <div
          id="location-picker-top-hud"
          className="absolute left-1/2 -translate-x-1/2 z-30 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-white rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 w-[94%] max-w-lg top-[4.25rem] md:top-[4.5rem] animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <Crosshair className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>{language === 'hi' ? '🎯 लोकेशन पिन पिकर' : '🎯 Location Pin Picker'}</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] rounded-full font-bold">Active</span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate">
                {language === 'hi'
                  ? 'मैप पर किसी भी जगह या विभाग पर क्लिक करें'
                  : 'Click anywhere on map or any building to place pin'}
              </p>
            </div>
          </div>
          {onCancelPick && (
            <button
              type="button"
              id="btn-cancel-location-pick"
              onClick={onCancelPick}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border border-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Bottom Confirmation Card (Shown when a spot is clicked) */}
      {isPickingLocation && tentativePick && (
        <div
          id="location-picker-confirm-card"
          className="absolute bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-400 p-3.5 sm:p-4 animate-slide-up"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                <MapPin className="w-5 h-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                  <span>{language === 'hi' ? 'स्थान चुना गया' : 'Spot Selected'}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                    GPS Ready
                  </span>
                </h4>
                <p className="text-[11px] font-mono text-zinc-600 font-bold tracking-tight truncate">
                  {tentativePick[0].toFixed(6)}, {tentativePick[1].toFixed(6)}
                </p>
                {nearestLocationToPick && (
                  <p className="text-[10px] text-zinc-500 truncate max-w-[190px] sm:max-w-[220px]">
                    📍 {nearestLocationToPick.title}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-confirm-location-pick"
              onClick={() => {
                onPickCoordinatesRef.current(tentativePick);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'hi' ? 'यह स्थान चुनें' : 'Confirm'}</span>
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 text-center">
            {language === 'hi' ? 'स्थान बदलने के लिए मैप पर दूसरी जगह क्लिक करें' : 'Tap another spot on map to move this pin'}
          </p>
        </div>
      )}

      {/* Floating Quick Button: Re-center & Zoom into entire Route (Hidden during active Live Nav) */}
      {navigationRoute && navigationRoute.path.length > 0 && !isLiveNavActive && (
        <button
          id="btn-zoom-to-route"
          type="button"
          onClick={handleFitRouteBounds}
          className="absolute right-3.5 bottom-24 z-20 px-3.5 py-2 bg-white hover:bg-slate-50 active:scale-95 text-blue-600 border border-slate-200 rounded-2xl shadow-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer pointer-events-auto"
          title={language === 'hi' ? 'पूरा रूट स्क्रीन पर देखें' : 'Fit Entire Route on Screen'}
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'hi' ? 'रूट पर ज़ूम करें' : 'Fit Route'}</span>
        </button>
      )}
    </div>
  );
};
