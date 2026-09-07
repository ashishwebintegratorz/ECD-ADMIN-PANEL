import React, { useState, useEffect, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Upload, FileText, Store, Phone, CheckCircle2, Hash, KeyRound, Plus, Image as ImageIcon, Trash2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoadScript } from '@react-google-maps/api';
import './RestaurantOnboard.css';

import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';

const libraries: ("places")[] = ["places"];



const RestaurantOnboard = () => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });
  const [mapError, setMapError] = useState('');
  const [autocompleteError, setAutocompleteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string, key?: string, name: string } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [location, setLocation] = useState('');
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [mapPosition, setMapPosition] = useState<{ lat: number, lng: number } | null>(null);

  const [restaurantId, setRestaurantId] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const generateCredentials = () => {
    let id = '';
    for (let i = 0; i < 14; i++) id += Math.floor(Math.random() * 10).toString();
    setRestaurantId(id);
  };

  // Sync map position with lat/lng strings only when user clicks map
  const handleMapClick = (latlng: { lat: number, lng: number }) => {
    setMapPosition(latlng);
    setMapLat(latlng.lat.toFixed(6));
    setMapLng(latlng.lng.toFixed(6));
    if (!location) setLocation('Selected from map');
  };

  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      try {
        if (!window.google) throw new Error("window.google is undefined");
        if (!window.google.maps) throw new Error("window.google.maps is undefined");

        const newMap = new window.google.maps.Map(mapRef.current, {
          center: mapPosition || { lat: 28.5355, lng: 77.3910 },
          zoom: 12,
        });
        setMap(newMap);

        newMap.addListener('click', (e: any) => {
          if (e.latLng) {
            handleMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        });
      } catch (err: any) {
        setMapError(err.message || String(err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, mapRef, map]);

  useEffect(() => {
    if (map && mapPosition) {
      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: mapPosition,
          map: map,
        });
      } else {
        markerRef.current.setPosition(mapPosition);
      }
      map.panTo(mapPosition);
    }
  }, [map, mapPosition]);

  useEffect(() => {
    if (isLoaded && inputRef.current) {
      try {
        if (!window.google?.maps?.places) throw new Error("Places API not loaded (libraries array might be missing or failed)");

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "in" },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const formattedAddress = place.formatted_address || place.name;
            handleMapClick({ lat, lng });
            if (formattedAddress) {
              setLocation(formattedAddress);
            }
          }
        });
      } catch (err: any) {
        setAutocompleteError(err.message || String(err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, inputRef]);

  const PRESET_PORTIONS = ['Full', 'Half', 'Quarter', '1 Pc', '2 Pcs', 'Small', 'Medium', 'Large'];

  interface OnboardPortionOption {
    name: string;
    price: string;
    b2bPrice: string;
    isDefault: boolean;
  }

  interface OnboardMenuItem {
    id: string;
    name: string;
    b2bPrice: string;
    sellingPrice: string;
    image: File | null;
    isVeg: boolean;
    description: string;
    portions: OnboardPortionOption[];
    showCustomPortionInput?: boolean;
    customPortionInput?: string;
  }

  const [menuItems, setMenuItems] = useState<OnboardMenuItem[]>([
    {
      id: 'item-1',
      name: '',
      b2bPrice: '',
      sellingPrice: '',
      image: null,
      isVeg: true,
      description: '',
      portions: [
        { name: 'Full', price: '', b2bPrice: '', isDefault: true }
      ],
      showCustomPortionInput: false,
      customPortionInput: '',
    }
  ]);

  const addMenuItem = () => {
    setMenuItems([
      ...menuItems,
      {
        id: `item-${Date.now()}`,
        name: '',
        b2bPrice: '',
        sellingPrice: '',
        image: null,
        isVeg: true,
        description: '',
        portions: [
          { name: 'Full', price: '', b2bPrice: '', isDefault: true }
        ],
        showCustomPortionInput: false,
        customPortionInput: '',
      }
    ]);
  };

  const updateMenuItem = (id: string, field: string, value: string | boolean | null) => {
    setMenuItems(menuItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeMenuItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const toggleItemPortion = (itemId: string, portionName: string) => {
    setMenuItems(menuItems.map(item => {
      if (item.id !== itemId) return item;
      const currentPortions = item.portions || [];
      const exists = currentPortions.some(p => p.name.toLowerCase() === portionName.toLowerCase());

      if (exists) {
        if (currentPortions.length <= 1) {
          alert('At least one portion is required for a menu item.');
          return item;
        }
        const filtered = currentPortions.filter(p => p.name.toLowerCase() !== portionName.toLowerCase());
        if (!filtered.some(p => p.isDefault)) {
          filtered[0].isDefault = true;
        }
        const def = filtered.find(p => p.isDefault) || filtered[0];
        return {
          ...item,
          portions: filtered,
          sellingPrice: def.price || item.sellingPrice,
          b2bPrice: def.b2bPrice || item.b2bPrice
        };
      } else {
        const newPortion: OnboardPortionOption = {
          name: portionName,
          price: item.sellingPrice || '',
          b2bPrice: item.b2bPrice || '',
          isDefault: currentPortions.length === 0
        };
        return {
          ...item,
          portions: [...currentPortions, newPortion]
        };
      }
    }));
  };

  const addCustomPortionToItem = (itemId: string) => {
    setMenuItems(menuItems.map(item => {
      if (item.id !== itemId) return item;
      const trimmed = (item.customPortionInput || '').trim();
      if (!trimmed) return item;
      const currentPortions = item.portions || [];
      const exists = currentPortions.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return { ...item, customPortionInput: '', showCustomPortionInput: false };
      }
      const newPortion: OnboardPortionOption = {
        name: trimmed,
        price: item.sellingPrice || '',
        b2bPrice: item.b2bPrice || '',
        isDefault: currentPortions.length === 0
      };
      return {
        ...item,
        portions: [...currentPortions, newPortion],
        customPortionInput: '',
        showCustomPortionInput: false
      };
    }));
  };

  const updateItemPortionField = (itemId: string, portionIndex: number, field: 'price' | 'b2bPrice', value: string) => {
    setMenuItems(menuItems.map(item => {
      if (item.id !== itemId) return item;
      const updated = [...(item.portions || [])];
      updated[portionIndex] = { ...updated[portionIndex], [field]: value };
      const isDef = updated[portionIndex].isDefault;
      return {
        ...item,
        portions: updated,
        ...(isDef && field === 'price' ? { sellingPrice: value } : {}),
        ...(isDef && field === 'b2bPrice' ? { b2bPrice: value } : {})
      };
    }));
  };

  const setItemDefaultPortion = (itemId: string, portionIndex: number) => {
    setMenuItems(menuItems.map(item => {
      if (item.id !== itemId) return item;
      const updated = (item.portions || []).map((p, i) => ({
        ...p,
        isDefault: i === portionIndex
      }));
      const def = updated[portionIndex];
      return {
        ...item,
        portions: updated,
        sellingPrice: def.price || item.sellingPrice,
        b2bPrice: def.b2bPrice || item.b2bPrice
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapLat || !mapLng) {
      alert("Please select a location on the map.");
      return;
    }

    setIsSubmitting(true);
    try {
      let logoUrl = '';
      let licenseUrl = '';
      if (logoFile) logoUrl = await uploadFile(logoFile);
      if (licenseFile) licenseUrl = await uploadFile(licenseFile);

      const createRes = await apiFetch('/restaurants/admin/create', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: `+91${phone}`,
          address: location,
          lat: mapLat,
          lng: mapLng,
          logo: logoUrl,
          accountDetail: licenseUrl,
          restaurantId: restaurantId || undefined,
          upi: upi || undefined,
        })
      });

      const newRestaurantId = createRes.restaurant._id;

      for (const item of menuItems) {
        if (!item.name) continue;
        let itemImageUrl = '';
        if (item.image) itemImageUrl = await uploadFile(item.image as unknown as File);

        const validPortions = (item.portions && item.portions.length > 0)
          ? item.portions.map(p => ({
              name: p.name,
              price: Number(p.price) || 0,
              b2bPrice: Number(p.b2bPrice) || 0,
              isDefault: !!p.isDefault
            }))
          : [{
              name: 'Full',
              price: Number(item.sellingPrice) || 0,
              b2bPrice: Number(item.b2bPrice) || 0,
              isDefault: true
            }];

        const defPortion = validPortions.find(p => p.isDefault) || validPortions[0];
        const primaryPrice = defPortion.price;
        const primaryB2BPrice = defPortion.b2bPrice;
        const primaryPortion = defPortion.name;

        await apiFetch(`/restaurants/admin/menu/add/${newRestaurantId}`, {
          method: 'POST',
          body: JSON.stringify({
            name: item.name,
            description: item.description,
            price: primaryPrice,
            b2bPrice: primaryB2BPrice,
            portion: primaryPortion,
            portions: validPortions,
            foodType: item.isVeg ? 'veg' : 'non-veg',
            image: itemImageUrl,
          })
        });
      }

      setSuccessData({
        id: createRes.restaurant.restaurantId,
        key: createRes.restaurant.restaurantKey || '',
        name: createRes.restaurant.name
      });
    } catch (error: unknown) {
      alert((error as Error).message || 'Failed to onboard restaurant');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="onboard-success">
        <div className="success-card glass-panel animate-fade-in" style={{ maxWidth: '600px', width: '100%' }}>
          <CheckCircle2 size={64} className="success-icon" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{successData.name} Onboarded!</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            The restaurant has been successfully added to the system.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Restaurant ID</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Hash size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-primary)' }}>{successData.id}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate('/restaurants')}>
              Go to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-onboard">
      <div className="page-header">
        <h1>Manual Onboarding</h1>
        <p>Add a new restaurant partner to the platform (Limit: 1000 Restaurants)</p>
      </div>

      <div className="onboard-content">
        <form className="onboard-form glass-panel" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Restaurant Name</label>
                <div className="input-with-icon">
                  <Store size={18} className="input-icon" />
                  <input type="text" placeholder="e.g. Spicy Kitchen" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-with-icon phone-field">
                  <Phone size={18} className="input-icon" />
                  <span style={{ position: 'absolute', left: '2.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>+91</span>
                  <input
                    type="tel"
                    placeholder="0000000000"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    minLength={10}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>UPI Key / ID</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input type="text" placeholder="e.g. restaurant@upi" value={upi} onChange={e => setUpi(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: '1fr' }}>

              <div className="form-group">
                <label>Search Restaurant Location</label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                    placeholder={isLoaded ? "Search for a restaurant or address..." : "Loading search..."}
                    disabled={!isLoaded}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  {autocompleteError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>Search Error: {autocompleteError}</div>}
                </div>
              </div>

              <div className="form-group">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>Or click on the map to accurately drop a pin.</p>
                <div
                  ref={mapRef}
                  style={{ height: '350px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)', zIndex: 0, background: 'rgba(255,255,255,0.02)' }}
                >
                  {loadError && <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Error Loading API: {loadError.message}</div>}
                  {mapError && <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Map Initialization Error: {mapError}</div>}
                  {!isLoaded && !loadError && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Map...</div>}
                </div>
                
                {/* Auto-populated address display */}
                {location && location !== 'Selected from map' && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: '#10b981',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <MapPin size={16} />
                    <strong>Selected Address:</strong> {location}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Credentials</h3>
              <button type="button" onClick={generateCredentials} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                Auto Generate
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Enter a 14-digit Restaurant ID manually, or auto-generate it. This is used by the restaurant to login.
            </p>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Restaurant ID (Login ID)</label>
                <div className="input-with-icon">
                  <Hash size={18} className="input-icon" />
                  <input type="text" placeholder="14-digit ID" value={restaurantId} onChange={e => setRestaurantId(e.target.value.replace(/\D/g, '').slice(0, 14))} minLength={14} maxLength={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Documents</h3>
            <div className="documents-grid">
              <div className="document-upload">
                <label>Restaurant Photo (Logo/Cover)</label>
                <div className="upload-dropzone" style={{ position: 'relative', overflow: 'hidden' }}>
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  ) : (
                    <>
                      <Upload size={32} className="upload-icon" />
                      <p>Drag and drop image here</p>
                      <span className="upload-hint" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Max size: 2 MB (Recommended &lt; 1 MB)</span>
                      <span className="upload-hint" style={{ fontSize: '0.75rem', color: '#64748b' }}>Supported: JPG, PNG, WEBP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input"
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setLogoFile(null);
                        return;
                      }
                      const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
                      if (!validation.isValid) {
                        alert(validation.error);
                        e.target.value = '';
                        return;
                      }
                      setLogoFile(file);
                    }}
                  />
                </div>
              </div>

              <div className="document-upload">
                <label>Operating License / FSSAI Document</label>
                <div className="upload-dropzone" style={{ position: 'relative', overflow: 'hidden' }}>
                  {licenseFile ? (
                    licenseFile.type.includes('image') ? (
                      <img src={URL.createObjectURL(licenseFile)} alt="License Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <FileText size={32} className="upload-icon" style={{ color: 'var(--accent-primary)' }} />
                        <p style={{ color: 'var(--accent-primary)' }}>{licenseFile.name}</p>
                      </div>
                    )
                  ) : (
                    <>
                      <FileText size={32} className="upload-icon" />
                      <p>Drag and drop document here</p>
                      <span className="upload-hint" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Max size: 5 MB</span>
                      <span className="upload-hint" style={{ fontSize: '0.75rem', color: '#64748b' }}>Supported: PDF, JPG, PNG</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="file-input"
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setLicenseFile(null);
                        return;
                      }
                      const validation = validateFile(file, {
                        maxSizeMB: 5,
                        recommendedSizeMB: 2,
                        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
                        typeDescription: 'PDF, JPG, PNG',
                      });
                      if (!validation.isValid) {
                        alert(validation.error);
                        e.target.value = '';
                        return;
                      }
                      setLicenseFile(file);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Initial Menu Items</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', marginTop: '-1rem' }}>
              Add items to the restaurant's menu. Max photo size: 2 MB (Recommended under 1 MB).
            </p>

            <div className="onboard-menu-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {menuItems.map((item) => (
                <div key={item.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0, marginTop: '0.5rem' }}>
                    {item.image ? (
                      <img src={URL.createObjectURL(item.image as unknown as File)} alt="Item Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    ) : (
                      <>
                        <ImageIcon size={24} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Max 2MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          updateMenuItem(item.id, 'image', null as any);
                          return;
                        }
                        const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
                        if (!validation.isValid) {
                          alert(validation.error);
                          e.target.value = '';
                          return;
                        }
                        updateMenuItem(item.id, 'image', file as any);
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Garlic Bread"
                        value={item.name}
                        onChange={(e) => updateMenuItem(item.id, 'name', e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Type</label>
                      <select
                        value={item.isVeg ? 'veg' : 'non-veg'}
                        onChange={(e) => updateMenuItem(item.id, 'isVeg', e.target.value === 'veg')}
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', appearance: 'auto' }}
                      >
                        <option value="veg" style={{ background: 'var(--bg-secondary)' }}>Vegetarian</option>
                        <option value="non-veg" style={{ background: 'var(--bg-secondary)' }}>Non-Vegetarian</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Delicious garlic bread with melted cheese"
                        value={item.description}
                        onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>

                    {/* ── MULTI-PORTION VARIANT SELECTOR ── */}
                    <div style={{ gridColumn: 'span 3', background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>Portions / Serving Sizes Available</label>
                        <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600 }}>Click to toggle available portions</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {PRESET_PORTIONS.map(portionName => {
                          const isSelected = (item.portions || []).some(p => p.name.toLowerCase() === portionName.toLowerCase());
                          return (
                            <button
                              key={portionName}
                              type="button"
                              onClick={() => toggleItemPortion(item.id, portionName)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '20px',
                                border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                color: isSelected ? '#1D4ED8' : '#475569',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: isSelected ? 600 : 500,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSelected ? '✓ ' : '+ '}{portionName}
                            </button>
                          );
                        })}

                        {!item.showCustomPortionInput ? (
                          <button
                            type="button"
                            onClick={() => setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, showCustomPortionInput: true } : m))}
                            style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px dashed #94A3B8', background: '#FFFFFF', color: '#475569', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                          >
                            + Custom Portion
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="e.g. 500ml, 4 Pcs"
                              value={item.customPortionInput || ''}
                              onChange={e => setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, customPortionInput: e.target.value } : m))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPortionToItem(item.id); } }}
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: '#FFFFFF', border: '1px solid #2563EB', borderRadius: '6px', color: '#0F172A', outline: 'none' }}
                              autoFocus
                            />
                            <button type="button" onClick={() => addCustomPortionToItem(item.id)} style={{ padding: '0.3rem 0.55rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Add</button>
                            <button type="button" onClick={() => setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, showCustomPortionInput: false } : m))} style={{ padding: '0.3rem 0.4rem', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                      </div>

                      {/* Portions Pricing Table */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', gap: '0.75rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', padding: '0 0.5rem' }}>
                          <span>Portion (Default)</span>
                          <span>Selling Price (₹)</span>
                          <span>B2B Cost (₹)</span>
                          <span></span>
                        </div>

                        {(item.portions || []).map((p, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', gap: '0.75rem', alignItems: 'center', background: p.isDefault ? '#EFF6FF' : '#FFFFFF', padding: '0.45rem 0.6rem', borderRadius: '8px', border: p.isDefault ? '1px solid #BFDBFE' : '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => setItemDefaultPortion(item.id, idx)}
                                title={p.isDefault ? "Default portion for customers" : "Click to make default"}
                                style={{
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '4px',
                                  border: p.isDefault ? 'none' : '1px solid #E2E8F0',
                                  background: p.isDefault ? '#2563EB' : '#F1F5F9',
                                  color: p.isDefault ? 'white' : '#64748B',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {p.isDefault ? 'DEFAULT' : 'SET DEF'}
                              </button>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: p.isDefault ? '#1D4ED8' : '#0F172A' }}>{p.name}</span>
                            </div>

                            <input
                              required
                              type="number"
                              placeholder="Sell ₹"
                              value={p.price}
                              onChange={e => updateItemPortionField(item.id, idx, 'price', e.target.value)}
                              style={{ padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#0F172A', fontSize: '0.875rem', outline: 'none' }}
                            />

                            <input
                              required
                              type="number"
                              placeholder="B2B ₹"
                              value={p.b2bPrice}
                              onChange={e => updateItemPortionField(item.id, idx, 'b2bPrice', e.target.value)}
                              style={{ padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#0F172A', fontSize: '0.875rem', outline: 'none' }}
                            />

                            <button
                              type="button"
                              onClick={() => toggleItemPortion(item.id, p.name)}
                              style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '4px' }}
                              title="Remove portion"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {menuItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMenuItem(item.id)}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addMenuItem}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', background: 'transparent', cursor: 'pointer', transition: 'all 0.3s' }}
              >
                <Plus size={20} />
                <span>Add Another Item</span>
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/restaurants')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Complete Onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff5555', background: '#1a1a1a', minHeight: '100vh', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong in RestaurantOnboard.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '1rem', background: 'rgba(255,0,0,0.1)', padding: '1rem' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '1rem', fontSize: '0.8rem', color: '#aaaaaa' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RestaurantOnboardWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <RestaurantOnboard />
    </ErrorBoundary>
  );
}
