import React, { useState, useEffect, useRef } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Compass, ExternalLink, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './DashboardZonesMap.css';

const libraries: ("places")[] = ["places"];

interface Zone {
  _id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  isActive: boolean;
}

export const DashboardZonesMap: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // Markers and Circles references
  const overlaysRef = useRef<{ markers: any[]; circles: any[] }>({ markers: [], circles: [] });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await apiFetch('/zones');
        if (res && res.zones) {
          setZones(res.zones);
        }
      } catch (err) {
        console.error('Error loading dashboard zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const defaultCenter = { lat: 28.4595, lng: 77.0266 };

      const gMap = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 7,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });

      setMap(gMap);
    }
  }, [isLoaded, map]);

  // Render Zone Circles & Markers on Map
  useEffect(() => {
    if (map && zones.length > 0) {
      // Clear previous overlays
      overlaysRef.current.markers.forEach((m) => m.setMap(null));
      overlaysRef.current.circles.forEach((c) => c.setMap(null));
      overlaysRef.current = { markers: [], circles: [] };

      const bounds = new window.google.maps.LatLngBounds();
      let hasValidCoords = false;

      zones.forEach((zone) => {
        if (!zone.center || typeof zone.center.lat !== 'number' || typeof zone.center.lng !== 'number') {
          return;
        }

        const centerLatLng = { lat: zone.center.lat, lng: zone.center.lng };
        bounds.extend(centerLatLng);
        hasValidCoords = true;

        const isOperational = zone.isActive;

        // Draw Circle
        const circle = new window.google.maps.Circle({
          strokeColor: isOperational ? "#16a34a" : "#dc2626",
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: isOperational ? "#22c55e" : "#ef4444",
          fillOpacity: isOperational ? 0.22 : 0.15,
          map,
          center: centerLatLng,
          radius: (zone.radiusKm || 15) * 1000,
        });

        // Draw Marker Pin
        const marker = new window.google.maps.Marker({
          position: centerLatLng,
          map,
          title: zone.name,
          label: {
            text: zone.name.substring(0, 3).toUpperCase(),
            color: "#ffffff",
            fontSize: "10px",
            fontWeight: "bold",
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: sans-serif; min-width: 160px; color: #0f172a;">
              <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #166534;">📍 ${zone.name}</h4>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;"><strong>Delivery Radius:</strong> ${zone.radiusKm} km (~${(Math.PI * zone.radiusKm * zone.radiusKm).toFixed(0)} km²)</p>
              <p style="margin: 0; font-size: 11px; font-weight: 600; color: ${isOperational ? '#15803d' : '#b91c1c'};">
                ${isOperational ? '● Active Operational' : '● Inactive'}
              </p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          setSelectedZone(zone);
          infoWindow.open(map, marker);
        });

        circle.addListener("click", () => {
          setSelectedZone(zone);
          infoWindow.open(map, marker);
        });

        overlaysRef.current.markers.push(marker);
        overlaysRef.current.circles.push(circle);
      });

      if (hasValidCoords) {
        if (zones.length === 1) {
          map.setCenter({ lat: zones[0].center.lat, lng: zones[0].center.lng });
          map.setZoom(11);
        } else {
          map.fitBounds(bounds);
        }
      }
    }
  }, [map, zones]);

  const activeZonesCount = zones.filter((z) => z.isActive).length;

  return (
    <div className="dashboard-zones-card glass-panel">
      <div className="dashboard-zones-header">
        <div className="title-area">
          <h3>
            <Compass size={20} className="header-icon" /> Live Delivery Zones & Geo-Fencing Overview
          </h3>
          <p className="subtitle">Visual real-time boundary coverage across operational delivery zones</p>
        </div>

        <div className="header-actions">
          <div className="zone-pill-stats">
            <span className="pill-item">
              <CheckCircle2 size={14} className="text-success" />
              <strong>{activeZonesCount}</strong> Active Zones
            </span>
            <span className="pill-item">
              <MapPin size={14} className="text-info" />
              <strong>{zones.length}</strong> Total Configured
            </span>
          </div>

          <button
            type="button"
            className="btn-manage-zones"
            onClick={() => navigate('/zones')}
          >
            <span>Manage Zones</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      <div className="dashboard-map-container" ref={mapRef}>
        {!isLoaded && <div className="map-placeholder">Loading interactive zones map...</div>}
        {loadError && <div className="map-placeholder">Unable to load Google Maps</div>}
      </div>

      {zones.length > 0 && (
        <div className="dashboard-zones-chip-bar">
          <span className="chip-label">Quick View:</span>
          {zones.map((zone) => (
            <button
              key={zone._id}
              type="button"
              className={`zone-chip ${selectedZone?._id === zone._id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedZone(zone);
                if (map) {
                  map.panTo({ lat: zone.center.lat, lng: zone.center.lng });
                  map.setZoom(12);
                }
              }}
            >
              <span className={`chip-dot ${zone.isActive ? 'active' : 'inactive'}`}></span>
              <strong>{zone.name}</strong> ({zone.radiusKm}km)
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardZonesMap;
