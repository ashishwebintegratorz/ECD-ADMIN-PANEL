import React, { useState, useEffect, useRef } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Compass, 
  Navigation, 
  Globe2, 
  AlertCircle,
  Layers,
  Edit3
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import './DeliveryZones.css';

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
  createdAt?: string;
}

export const DeliveryZones = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [zoneName, setZoneName] = useState('');
  const [lat, setLat] = useState<number>(28.4595);
  const [lng, setLng] = useState<number>(77.0266);
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Map References
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter in directory
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch all delivery zones
  const fetchZones = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/zones');
      if (res && res.zones) {
        setZones(res.zones);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch delivery zones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Initialize Google Map
  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const gMap = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 11,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: gMap,
        draggable: true,
        title: "Zone Center Pin",
      });

      const circle = new window.google.maps.Circle({
        strokeColor: "#16a34a",
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: "#22c55e",
        fillOpacity: 0.22,
        map: gMap,
        center: { lat, lng },
        radius: radiusKm * 1000,
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = Number(pos.lat().toFixed(6));
          const newLng = Number(pos.lng().toFixed(6));
          setLat(newLat);
          setLng(newLng);
          circle.setCenter({ lat: newLat, lng: newLng });
        }
      });

      gMap.addListener("click", (e: any) => {
        const clickedLat = Number(e.latLng.lat().toFixed(6));
        const clickedLng = Number(e.latLng.lng().toFixed(6));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setPosition({ lat: clickedLat, lng: clickedLng });
        circle.setCenter({ lat: clickedLat, lng: clickedLng });
      });

      // Google Places Autocomplete with suggestions dropdown
      if (searchInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: "in" },
          fields: ["geometry", "name", "formatted_address"]
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            const newLat = Number(place.geometry.location.lat().toFixed(6));
            const newLng = Number(place.geometry.location.lng().toFixed(6));
            setLat(newLat);
            setLng(newLng);
            gMap.setCenter({ lat: newLat, lng: newLng });
            gMap.setZoom(12);
            marker.setPosition({ lat: newLat, lng: newLng });
            circle.setCenter({ lat: newLat, lng: newLng });

            if (place.name) {
              setZoneName(place.name);
            }
          }
        });
      }

      markerRef.current = marker;
      circleRef.current = circle;
      setMap(gMap);
    }
  }, [isLoaded, map]);

  // Update map circle & marker when radius or coordinates change
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
      circleRef.current.setCenter({ lat, lng });
    }
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
  }, [radiusKm, lat, lng]);

  // Handle Form Submit: Create / Update Zone
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      setError('Zone / Area Name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        name: zoneName.trim(),
        lat,
        lng,
        radiusKm,
        isActive,
      };

      if (editingZoneId) {
        await apiFetch(`/zones/${editingZoneId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Delivery Zone '${zoneName}' updated successfully!`);
        setEditingZoneId(null);
      } else {
        const res = await apiFetch('/zones', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(res.message || `Delivery Zone '${zoneName}' created successfully!`);
      }

      setZoneName('');
      await fetchZones();
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Zone Active
  const handleToggleZone = async (zone: Zone) => {
    try {
      await apiFetch(`/zones/${zone._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      fetchZones();
    } catch (err: any) {
      setError(err.message || 'Failed to update zone status');
    }
  };

  // Delete Zone
  const handleDeleteZone = async (zone: Zone) => {
    if (!window.confirm(`Are you sure you want to delete delivery zone '${zone.name}'?`)) {
      return;
    }
    try {
      await apiFetch(`/zones/${zone._id}`, {
        method: 'DELETE',
      });
      fetchZones();
      setSuccessMsg(`Delivery zone '${zone.name}' deleted.`);
      if (editingZoneId === zone._id) {
        setEditingZoneId(null);
        setZoneName('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete delivery zone');
    }
  };

  // View on Map & Edit Zone
  const handleSelectZoneForEdit = (zone: Zone) => {
    setEditingZoneId(zone._id);
    setZoneName(zone.name);
    setLat(zone.center.lat);
    setLng(zone.center.lng);
    setRadiusKm(zone.radiusKm || 15);
    setIsActive(zone.isActive);

    if (map) {
      map.panTo({ lat: zone.center.lat, lng: zone.center.lng });
      map.setZoom(12);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingZoneId(null);
    setZoneName('');
  };

  const filteredZones = zones.filter((z) => {
    return searchFilter === '' || z.name.toLowerCase().includes(searchFilter.toLowerCase());
  });

  const totalZonesCount = zones.length;
  const activeZonesCount = zones.filter((z) => z.isActive).length;

  return (
    <div className="delivery-zones-container">
      {/* Header */}
      <div className="zones-header">
        <div>
          <h1 className="zones-title">
            <Compass className="inline-icon" /> Service Delivery Zones & Geo-Fencing
          </h1>
          <p className="zones-subtitle">
            Define active operational service radiuses for Restaurants, Riders, and Customer orders with live interactive Map.
          </p>
        </div>
        <div className="zones-header-actions">
          <div className="zones-header-badges">
            <span className="badge badge-total">Total Zones: {totalZonesCount}</span>
            <span className="badge badge-active">Active Operational: {activeZonesCount}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Interactive Map & Zone Creation Form */}
      <div className="zones-workspace-grid">
        {/* Map Panel */}
        <div className="card map-panel-card">
          <div className="card-header">
            <h3>
              <Navigation size={18} /> Interactive Boundary Map
            </h3>
            <span className="coverage-indicator">
              Coverage Radius: <strong>{radiusKm} km</strong> (~{(Math.PI * radiusKm * radiusKm).toFixed(0)} km²)
            </span>
          </div>

          <div className="map-search-bar">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Area, City, or Landmark (e.g. Gurgaon, Haryana, Bhubaneswar, Cyber City)..."
              className="map-search-input"
            />
          </div>

          <div className="map-wrapper" ref={mapRef}>
            {!isLoaded && <div className="map-loading">Loading Google Maps engine...</div>}
            {loadError && <div className="map-error">Error loading Google Maps API</div>}
          </div>

          <div className="map-footer-coords">
            <span>
              Center Coordinates: <strong>{lat.toFixed(4)} N, {lng.toFixed(4)} E</strong>
            </span>
            <span className="help-text">Click anywhere on the map or drag the marker to adjust zone center.</span>
          </div>
        </div>

        {/* Zone Creation Form */}
        <div className="card form-panel-card">
          <div className="card-header">
            <h3>
              {editingZoneId ? <Edit3 size={18} /> : <Plus size={18} />}
              {editingZoneId ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
            </h3>
            {editingZoneId && (
              <button type="button" className="btn-link" onClick={handleCancelEdit}>
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveZone} className="zone-form">
            <div className="form-group">
              <label>Delivery Zone / Area Name *</label>
              <input
                type="text"
                placeholder="e.g. Gurgaon / Faridabad / Bhubaneswar / Cyber City Hub"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="slider-label-row">
                <label>
                  Delivery Radius: <strong>{radiusKm} km</strong>
                </label>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="radius-slider"
              />
            </div>

            <div className="form-checkbox-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">Active for Ordering & Rider Dispatching</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving Zone...'
                  : editingZoneId
                  ? 'Update Delivery Zone'
                  : '+ Create Delivery Zone'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card zones-directory-card">
        <div className="card-header table-header">
          <div>
            <h3><Layers size={18} /> Configured Delivery Zones Directory</h3>
            <p className="section-desc">Live operational boundaries and dispatch radiuses</p>
          </div>

          <div className="table-filters">
            <div className="filter-input-wrap">
              <Search size={14} />
              <input
                type="text"
                placeholder="Filter by zone name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="table-loading">Loading delivery zones...</div>
        ) : filteredZones.length === 0 ? (
          <div className="table-empty">
            <Globe2 size={40} className="empty-icon" />
            <p>No delivery zones found. Pin a location on the map above and click "+ Create Delivery Zone".</p>
          </div>
        ) : (
          <div className="subareas-table-wrap">
            <table className="subareas-table">
              <thead>
                <tr>
                  <th>Delivery Zone / Area</th>
                  <th>Center Coordinates</th>
                  <th>Radius</th>
                  <th>Coverage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map((zone) => (
                  <tr key={zone._id} className={!zone.isActive ? 'row-inactive' : ''}>
                    <td>
                      <div className="subarea-name-cell">
                        <MapPin size={16} className="pin-icon" />
                        <strong>{zone.name}</strong>
                      </div>
                    </td>
                    <td>
                      <code className="coords-code">
                        {zone.center?.lat?.toFixed(4) || '28.4595'}, {zone.center?.lng?.toFixed(4) || '77.0266'}
                      </code>
                    </td>
                    <td>
                      <span className="radius-badge">{zone.radiusKm} km</span>
                    </td>
                    <td>
                      <span className="area-calc">
                        ~{(Math.PI * zone.radiusKm * zone.radiusKm).toFixed(0)} km²
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleZone(zone)}
                        className={`status-btn-sm ${zone.isActive ? 'active' : 'inactive'}`}
                        title="Toggle Zone Active Status"
                      >
                        {zone.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {zone.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn focus-btn"
                          title="View on Map & Edit"
                          onClick={() => handleSelectZoneForEdit(zone)}
                        >
                          <Navigation size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete-btn"
                          title="Delete Delivery Zone"
                          onClick={() => handleDeleteZone(zone)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryZones;
