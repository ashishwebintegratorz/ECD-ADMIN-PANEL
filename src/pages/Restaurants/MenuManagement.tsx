import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { apiFetch, uploadFile } from '../../utils/api';
import { Plus, Image as ImageIcon, Trash2, Edit2, X } from 'lucide-react';
import './MenuManagement.css';

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number | string;
  b2bPrice: number | string;
  image: string | null;
  foodType: 'veg' | 'non-veg' | 'vegan';
  isAvailable: boolean;
}

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
    image: null,
    foodType: 'veg',
    isAvailable: true
  });
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setImageUploading(true);
        const url = await uploadFile(e.target.files[0]);
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
      image: null,
      foodType: 'veg',
      isAvailable: true
    });
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeId = id || selectedRestId;
    if (!activeId) return;

    setSaving(true);
    try {
      if (editingItem && editingItem._id) {
        // Update
        await apiFetch(`/restaurants/admin/menu/update/${activeId}/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        // Add
        await apiFetch(`/restaurants/admin/menu/add/${activeId}`, {
          method: 'POST',
          body: JSON.stringify(formData)
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
          <p>Organize menu items for your restaurant</p>
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
                  <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={32} color="var(--text-secondary)" opacity={0.5} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.name}
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: item.foodType === 'veg' ? 'rgba(16, 185, 129, 0.1)' : item.foodType === 'non-veg' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: item.foodType === 'veg' ? '#10b981' : item.foodType === 'non-veg' ? '#ef4444' : '#8b5cf6', textTransform: 'uppercase' }}>
                        {item.foodType}
                      </span>
                      {!item.isAvailable && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>Unavailable</span>}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{item.description || 'No description'}</p>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sell: ₹{item.price}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>B2B: ₹{item.b2bPrice}</span>
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'block', zIndex: 99999, backdropFilter: 'blur(4px)', padding: '100px 1rem 50px', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', margin: '0 auto' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            
            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Item Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', resize: 'none' }} />
              </div>

              <div className="form-group">
                <label>Food Image</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  {formData.image && (
                    <img src={formData.image} alt="Preview" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    disabled={imageUploading}
                    style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }} 
                  />
                </div>
                {imageUploading && <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.5rem', display: 'block' }}>Uploading image...</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Selling Price (₹)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>B2B Price (₹)</label>
                  <input required type="number" value={formData.b2bPrice} onChange={e => setFormData({...formData, b2bPrice: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Food Type</label>
                  <select value={formData.foodType} onChange={e => setFormData({...formData, foodType: e.target.value as any})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 0' }}>
                    <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                    Item Available?
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={saving || imageUploading} style={{ marginTop: '1rem' }}>
                {saving ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
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
