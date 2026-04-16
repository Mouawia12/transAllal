'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import type { LiveDriver } from '../../types/shared';

const DEFAULT_CENTER: LatLngExpression = [28.0339, 1.6596];
const DEFAULT_ZOOM = 5;
const FOCUSED_ZOOM = 13;

function markerColor(driver: LiveDriver) {
  if (driver.isOnline && driver.tripId) {
    return '#0f9d58';
  }

  if (driver.isOnline) {
    return '#d97706';
  }

  return '#64748b';
}

function formatSpeed(speedKmh: number | null) {
  if (speedKmh === null || !Number.isFinite(speedKmh)) {
    return '—';
  }

  return `${speedKmh} km/h`;
}

/**
 * Syncs the Leaflet viewport to the selected driver.
 *
 * Key design decisions:
 * - flyTo is ONLY called when selectedDriverId changes (not on every location
 *   update). We track the previous ID in a ref so we can detect actual
 *   selection changes even though the `selected` object reference changes on
 *   every 5-second location tick.
 * - fitBounds runs on initial render (when prevSelectedId is undefined) and
 *   whenever the selection is cleared, so the map always frames all drivers
 *   when no one is focused.
 * - Drivers without coordinates are excluded from bounds calculation and
 *   marker rendering.
 */
function MapViewportSync({
  drivers,
  selectedDriverId,
  selected,
}: {
  drivers: LiveDriver[];
  selectedDriverId: string | null;
  selected: LiveDriver | null;
}) {
  const map = useMap();
  // undefined = component just mounted (initial render)
  const prevSelectedId = useRef<string | null | undefined>(undefined);

  const driversWithCoords = useMemo(
    () =>
      drivers.filter(
        (d): d is LiveDriver & { lat: number; lng: number } =>
          d.lat !== null && d.lng !== null,
      ),
    [drivers],
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (driversWithCoords.length < 2) return null;
    return driversWithCoords.map((d) => [d.lat, d.lng] as [number, number]);
  }, [driversWithCoords]);

  useEffect(() => {
    map.invalidateSize();
  }, [map, drivers.length]);

  useEffect(() => {
    const isInitial = prevSelectedId.current === undefined;
    const idChanged = prevSelectedId.current !== selectedDriverId;
    prevSelectedId.current = selectedDriverId;

    // Location updates change the `selected` object reference but not the
    // selectedDriverId string — bail out early so we don't flyTo on every tick.
    if (!idChanged && !isInitial) return;

    if (selectedDriverId && selected && selected.lat !== null && selected.lng !== null) {
      map.flyTo([selected.lat, selected.lng], FOCUSED_ZOOM, {
        animate: true,
        duration: 1.1,
      });
      return;
    }

    // No selection (initial load or selection cleared) — frame all drivers.
    if (bounds) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [bounds, map, selected, selectedDriverId]);

  return null;
}

export function LiveTrackingMap({
  drivers,
  selectedDriverId,
  onSelectDriver,
}: {
  drivers: LiveDriver[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
}) {
  const selected =
    drivers.find((driver) => driver.driverId === selectedDriverId) ?? null;

  // Only render markers for drivers whose position is known.
  const mappableDrivers = useMemo(
    () =>
      drivers.filter(
        (d): d is LiveDriver & { lat: number; lng: number } =>
          d.lat !== null && d.lng !== null,
      ),
    [drivers],
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      scrollWheelZoom
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <MapViewportSync
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        selected={selected}
      />

      {mappableDrivers.map((driver) => {
        const isSelected = driver.driverId === selectedDriverId;
        const color = markerColor(driver);

        return (
          <CircleMarker
            key={driver.driverId}
            center={[driver.lat, driver.lng]}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            radius={isSelected ? 12 : 9}
            eventHandlers={{
              click: () => onSelectDriver(driver.driverId),
            }}
          >
            <Popup autoPan={false} closeButton={false}>
              <div className="min-w-[11rem] space-y-1.5">
                <p className="text-sm font-semibold text-slate-900">
                  {driver.firstName} {driver.lastName}
                </p>
                <p className="text-xs text-slate-600">
                  {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                </p>
                <p className="text-xs text-slate-600">
                  السرعة: {formatSpeed(driver.speedKmh)}
                </p>
                {driver.batteryLevel != null && (
                  <p className="text-xs text-slate-600">
                    البطارية: {driver.batteryLevel}%
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
