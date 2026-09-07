import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';
import { Plus, Image as ImageIcon, Trash2, Edit2, X } from 'lucide-react';
import './MenuManagement.css';

interface PortionOption {
  name: string;
  price: number | string;
  b2bPrice: number | string;
  isDefault?: boolean;
}

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number | string;
  b2bPrice: number | string;
  portion?: string;
  portions?: PortionOption[];
  image: string | null;
  foodType: 'veg' | 'non-veg' | 'vegan';
  isAvailable: boolean;
}

const PRESET_PORTIONS = ['Full', 'Half', 'Quarter', '1 Pc', '2 Pcs', 'Small', 'Medium', 'Large'];

const MenuManagement = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedRestId, setSelectedRestId] = useState<string>(id || '');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItem>({
    name: '',
    description: '',
    price: '',
    b2bPrice: '',
    portion: 'Full',
    portions: [{ name: 'Full', price: '', b2bPrice: '', isDefault: true }],
    image: null,
    foodType: 'veg',
    isAvailable: true
  });
  const [customPortionInput, setCustomPortionInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
      if (!validation.isValid) {
        alert(validation.error);
        e.target.value = '';
        return;
      }

      try {
        setImageUploading(true);
        const url = await uploadFile(file, { maxSizeMB: 2, recommendedSizeMB: 1 });
        setFormData(prev => ({ ...prev, image: url }));
      } catch (err: any) {
        alert(err.message || 'Failed to upload image');
      } finally {
        setImageUploading(false);
      }
    }
  };

  // Fetch restaurants for dropdown
  useEffect(() => {
    if (!id) {
      const loadRestaurants = async () => {
        try {
          const data = await apiFetch('/restaurants/list');
          setRestaurants(data.restaurants || data);
          if (data.restaurants?.length > 0 && !selectedRestId) {
            setSelectedRestId(data.restaurants[0]._id);
          } else if (data.length > 0 && !selectedRestId) {
            setSelectedRestId(data[0]._id);
          }
        } catch (e) { console.error(e); }
      };
      loadRestaurants();
    }
  }, [id]);

  // Fetch the full menu (admin profile has b2b prices)
  const fetchMenu = async () => {
    const activeId = id || selectedRestId;
    if (!activeId) return;

    try {
      setLoading(true);
      const res = await apiFetch(`/restaurants/${activeId}/profile`);
      if (res.restaurant?.menu) {
        setMenu(res.restaurant.menu);
      } else {
        setMenu([]);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [id, selectedRestId]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      b2bPrice: '',
      portion: 'Full',
      portions: [{ name: 'Full', price: '', b2bPrice: '', isDefault: true }],
      image: null,
      foodType: 'veg',
      isAvailable: true
    });
    setCustomPortionInput('');
    setShowCustomInput(false);
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    let itemPortions: PortionOption[] = [];
    if (item.portions && item.portions.length > 0) {
      itemPortions = item.portions.map(p => ({
        name: p.name,
        price: p.price ?? item.price,
        b2bPrice: p.b2bPrice ?? item.b2bPrice,
        isDefault: p.isDefault ?? (p.name === (item.portion || 'Full'))
      }));
    } else {
      itemPortions = [{
        name: item.portion || 'Full',
        price: item.price,
        b2bPrice: item.b2bPrice,
        isDefault: true
      }];
    }

    // Ensure at least one is default
    if (!itemPortions.some(p => p.isDefault)) {
      itemPortions[0].isDefault = true;
    }

    setFormData({
      ...item,
      portion: item.portion || itemPortions.find(p => p.isDefault)?.name || 'Full',
      portions: itemPortions
    });
    setCustomPortionInput('');
    setShowCustomInput(false);
    setShowModal(true);
  };

  const togglePortion = (portionName: string) => {
    const currentPortions = formData.portions || [];
    const exists = currentPortions.some(p => p.name.toLowerCase() === portionName.toLowerCase());

    if (exists) {
      if (currentPortions.length <= 1) {
        alert('At least one portion is required for a menu item.');
        return;
      }
      const filtered = currentPortions.filter(p => p.name.toLowerCase() !== portionName.toLowerCase());
      if (!filtered.some(p => p.isDefault)) {
        filtered[0].isDefault = true;
      }
      const def = filtered.find(p => p.isDefault) || filtered[0];
      setFormData({
        ...formData,
        portions: filtered,
        portion: def.name,
        price: def.price || formData.price,
        b2bPrice: def.b2bPrice || formData.b2bPrice
      });
    } else {
      const newPortion: PortionOption = {
        name: portionName,
        price: formData.price || '',
        b2bPrice: formData.b2bPrice || '',
        isDefault: currentPortions.length === 0
      };
      setFormData({
        ...formData,
        portions: [...currentPortions, newPortion]
      });
    }
  };

  const addCustomPortion = () => {
    const trimmed = customPortionInput.trim();
    if (!trimmed) return;
    togglePortion(trimmed);
    setCustomPortionInput('');
    setShowCustomInput(false);
  };

  const updatePortionField = (index: number, field: 'price' | 'b2bPrice', value: string) => {
    const updated = [...(formData.portions || [])];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating default portion, sync to root form price
    const isDef = updated[index].isDefault;
    setFormData({
      ...formData,
      portions: updated,
      ...(isDef && field === 'price' ? { price: value } : {}),
      ...(isDef && field === 'b2bPrice' ? { b2bPrice: value } : {})
    });
  };

  const setDefaultPortion = (index: number) => {
    const updated = (formData.portions || []).map((p, i) => ({
      ...p,
      isDefault: i === index
    }));
    const def = updated[index];
    setFormData({
      ...formData,
      portions: updated,
      portion: def.name,
      price: def.price || formData.price,
      b2bPrice: def.b2bPrice || formData.b2bPrice
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeId = id || selectedRestId;
    if (!activeId) return;

    // Validate portions
    const portions = formData.portions && formData.portions.length > 0 ? formData.portions : [
      { name: formData.portion || 'Full', price: formData.price, b2bPrice: formData.b2bPrice, isDefault: true }
    ];

    const defaultPortion = portions.find(p => p.isDefault) || portions[0];
    const payload = {
      ...formData,
      price: Number(defaultPortion.price) || Number(formData.price) || 0,
      b2bPrice: Number(defaultPortion.b2bPrice) || Number(formData.b2bPrice) || 0,
      portion: defaultPortion.name,
      portions: portions.map(p => ({
        name: p.name,
        price: Number(p.price) || 0,
        b2bPrice: Number(p.b2bPrice) || 0,
        isDefault: !!p.isDefault
      }))
    };

    setSaving(true);
    try {
      if (editingItem && editingItem._id) {
        // Update
        await apiFetch(`/restaurants/admin/menu/update/${activeId}/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        // Add
        await apiFetch(`/restaurants/admin/menu/add/${activeId}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setShowModal(false);
      fetchMenu(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    
    const activeId = id || selectedRestId;
    try {
      await apiFetch(`/restaurants/admin/menu/delete/${activeId}/${itemId}`, {
        method: 'DELETE'
      });
      fetchMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  return (
    <div className="menu-management">
      <div className="page-header">
        <div>
          <h1>Menu Management</h1>
          <p>Organize menu items & portions for your restaurant</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!id && (
            <select 
              value={selectedRestId} 
              onChange={(e) => setSelectedRestId(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
            >
              <option value="" style={{ background: 'var(--bg-secondary)' }}>Select Restaurant...</option>
              {restaurants.map((r: any) => (
                <option key={r._id} value={r._id} style={{ background: 'var(--bg-secondary)' }}>{r.name}</option>
              ))}
            </select>
          )}
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={20} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="menu-content">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading menu...</div>
        ) : menu.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No menu items found for this restaurant. Click 'Add Item' to create one.
          </div>
        ) : (
          <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {menu.map((item, idx) => (
              <div key={item._id || idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '85px', height: '85px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={32} color="var(--text-secondary)" opacity={0.5} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {item.name}
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: item.foodType === 'veg' ? 'rgba(16, 185, 129, 0.1)' : item.foodType === 'non-veg' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: item.foodType === 'veg' ? '#10b981' : item.foodType === 'non-veg' ? '#ef4444' : '#8b5cf6', textTransform: 'uppercase' }}>
                        {item.foodType}
                      </span>
                      {!item.isAvailable && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>Unavailable</span>}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.6rem' }}>{item.description || 'No description'}</p>
                    
                    {/* Portion badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.portions && item.portions.length > 0 ? (
                        item.portions.map((p, pi) => (
                          <div key={pi} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: p.isDefault ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)', border: p.isDefault ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: p.isDefault ? '#60a5fa' : 'var(--text-primary)' }}>{p.name}{p.isDefault ? ' ★' : ''}:</span>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>₹{p.price}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>(B2B: ₹{p.b2bPrice})</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sell: ₹{item.price}</span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>B2B: ₹{item.b2bPrice}</span>
                          <span style={{ fontSize: '0.8rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>{item.portion || 'Full'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => openEditModal(item)} className="icon-btn" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => item._id && handleDeleteItem(item._id)} className="icon-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'block', zIndex: 99999, backdropFilter: 'blur(4px)', padding: '60px 1rem 50px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '580px', padding: '2rem', position: 'relative', margin: '0 auto', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={22} />
            </button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>{editingItem ? 'Edit Menu Item & Portions' : 'Add New Menu Item'}</h2>
            
            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Item Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Chicken Biryani, Butter Naan" style={{ width: '100%', padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A', fontSize: '0.95rem', outline: 'none' }} />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Delicious prepared with aromatic spices..." rows={2} style={{ width: '100%', padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A', fontSize: '0.95rem', resize: 'none', outline: 'none' }} />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Food Image</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  {formData.image && (
                    <img src={formData.image} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }} />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    disabled={imageUploading}
                    style={{ flex: 1, padding: '0.5rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} 
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                  Max file size: 2 MB (Recommended: under 1 MB for fast app loading) • JPG, PNG, WEBP
                </span>
                {imageUploading && <span style={{ fontSize: '0.8rem', color: '#2563EB', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>Uploading image...</span>}
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Food Type</label>
                <select value={formData.foodType} onChange={e => setFormData({...formData, foodType: e.target.value as any})} style={{ width: '100%', padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>

              {/* ── MULTI-PORTION VARIANT SELECTOR ── */}
              <div className="form-group" style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>Portions / Serving Sizes Available</label>
                  <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600 }}>Click to toggle available portions</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {PRESET_PORTIONS.map(portionName => {
                    const isSelected = (formData.portions || []).some(p => p.name.toLowerCase() === portionName.toLowerCase());
                    return (
                      <button
                        key={portionName}
                        type="button"
                        onClick={() => togglePortion(portionName)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          color: isSelected ? '#1D4ED8' : '#475569',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 500,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{portionName}
                      </button>
                    );
                  })}
                  
                  {!showCustomInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px dashed #94A3B8', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                    >
                      + Custom Portion
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="e.g. 500ml, 4 Pcs"
                        value={customPortionInput}
                        onChange={e => setCustomPortionInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPortion(); } }}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', background: '#FFFFFF', border: '1px solid #2563EB', borderRadius: '6px', color: '#0F172A', outline: 'none' }}
                        autoFocus
                      />
                      <button type="button" onClick={addCustomPortion} style={{ padding: '0.35rem 0.6rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Add</button>
                      <button type="button" onClick={() => setShowCustomInput(false)} style={{ padding: '0.35rem 0.5rem', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  )}
                </div>

                {/* Portions Pricing Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', gap: '0.75rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', padding: '0 0.5rem' }}>
                    <span>Portion (Default)</span>
                    <span>Selling Price (₹)</span>
                    <span>B2B Cost (₹)</span>
                    <span></span>
                  </div>

                  {(formData.portions || []).map((p, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', gap: '0.75rem', alignItems: 'center', background: p.isDefault ? '#EFF6FF' : '#FFFFFF', padding: '0.5rem 0.6rem', borderRadius: '8px', border: p.isDefault ? '1px solid #BFDBFE' : '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setDefaultPortion(idx)}
                          title={p.isDefault ? "Default portion for customers" : "Click to make default"}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            border: p.isDefault ? 'none' : '1px solid #E2E8F0',
                            background: p.isDefault ? '#2563EB' : '#F1F5F9',
                            color: p.isDefault ? 'white' : '#64748B',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {p.isDefault ? 'DEFAULT' : 'SET DEF'}
                        </button>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: p.isDefault ? '#1D4ED8' : '#0F172A' }}>{p.name}</span>
                      </div>

                      <input
                        required
                        type="number"
                        placeholder="Sell ₹"
                        value={p.price}
                        onChange={e => updatePortionField(idx, 'price', e.target.value)}
                        style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#0F172A', fontSize: '0.9rem', outline: 'none' }}
                      />

                      <input
                        required
                        type="number"
                        placeholder="B2B ₹"
                        value={p.b2bPrice}
                        onChange={e => updatePortionField(idx, 'b2bPrice', e.target.value)}
                        style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#0F172A', fontSize: '0.9rem', outline: 'none' }}
                      />

                      <button
                        type="button"
                        onClick={() => togglePortion(p.name)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '4px' }}
                        title="Remove portion"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0', color: '#334155', fontWeight: 500 }}>
                  <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                  Item Available for Ordering?
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={saving || imageUploading} style={{ marginTop: '0.5rem', padding: '0.85rem', fontWeight: 700, borderRadius: '8px' }}>
                {saving ? 'Saving...' : (editingItem ? 'Update Menu Item' : 'Add Menu Item')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MenuManagement;
