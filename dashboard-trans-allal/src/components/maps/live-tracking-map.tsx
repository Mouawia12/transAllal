'use client';

import { useEffect, useMemo } from 'react';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
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

function MapViewportSync({
  drivers,
  selected,
}: {
  drivers: LiveDriver[];
  selected: LiveDriver | null;
}) {
  const map = useMap();

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (drivers.length < 2) {
      return null;
    }

    return drivers.map((driver) => [driver.lat, driver.lng]);
  }, [drivers]);

  useEffect(() => {
    map.invalidateSize();
  }, [map, drivers.length]);

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], FOCUSED_ZOOM, {
        animate: true,
        duration: 1.1,
      });
      return;
    }

    if (bounds) {
      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 8,
      });
      return;
    }

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }, [bounds, map, selected]);

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
      <MapViewportSync drivers={drivers} selected={selected} />

      {drivers.map((driver) => {
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
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
