import { useState, useEffect } from 'react';
import { Search, Plus, Store, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';
import './RestaurantOverview.css';

interface Restaurant {
  _id: string;
  name: string;
  categories: string[];
  isActive: boolean;
  isOnline: boolean;
  orderCount: number;
  walletBalance: number;
  featured: boolean;
  logo?: string;
  coverImage?: string;
  accountDetail?: string; // Bank passbook
  paymentQr?: string;
  upi?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const RestaurantOverview = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    let isMounted = true;
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/restaurants/list?limit=1000');
        if (isMounted) setRestaurants(data.restaurants || []);
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRestaurants();
    return () => { isMounted = false; };
  }, []);

  const toggleStatus = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation(); // Prevent navigating to menu
    try {
      await apiFetch(`/restaurants/${id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      setRestaurants(restaurants.map(r => r._id === id ? { ...r, isActive: !currentStatus } : r));
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const deleteRestaurant = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This action cannot be undone.`)) {
      try {
        await apiFetch(`/admin/restaurants/${id}`, {
          method: 'DELETE'
        });
        setRestaurants(restaurants.filter(r => r._id !== id));
        alert("Restaurant successfully deleted");
      } catch (error: any) {
        alert(error.message || "Failed to delete restaurant");
      }
    }
  };

  const handleCardClick = (restaurant: Restaurant) => {
    navigate(`/restaurants/${restaurant._id}/menu`);
  };

  const openEditModal = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation();
    setSelectedRestaurant(restaurant);
    setEditForm({ name: restaurant.name || '', phone: restaurant.phone || '' });
    setIsModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedRestaurant) return;
    setIsUpdating(true);
    try {
      await apiFetch(`/restaurants/admin/update/${selectedRestaurant._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editForm.name, phone: editForm.phone })
      });
      setRestaurants(restaurants.map(r => r._id === selectedRestaurant._id ? { ...r, name: editForm.name, phone: editForm.phone } : r));
      setSelectedRestaurant({ ...selectedRestaurant, name: editForm.name, phone: editForm.phone });
      alert("Restaurant details updated!");
    } catch (error: any) {
      alert(error.message || "Failed to update details");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (field: 'logo' | 'coverImage' | 'accountDetail' | 'paymentQr', file: File) => {
    if (!selectedRestaurant) return;

    const isDoc = field === 'accountDetail';
    const validation = validateFile(file, {
      maxSizeMB: isDoc ? 5 : 2,
      recommendedSizeMB: isDoc ? 2 : 1,
      allowedTypes: isDoc
        ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        : ['image/jpeg', 'image/png', 'image/webp'],
      typeDescription: isDoc ? 'PDF, JPG, PNG' : 'JPG, PNG, WEBP',
    });

    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsUpdating(true);
    try {
      const url = await uploadFile(file, { maxSizeMB: isDoc ? 5 : 2, recommendedSizeMB: isDoc ? 2 : 1 });
      await apiFetch(`/restaurants/admin/update/${selectedRestaurant._id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: url })
      });
      setRestaurants(restaurants.map(r => r._id === selectedRestaurant._id ? { ...r, [field]: url } : r));
      setSelectedRestaurant({ ...selectedRestaurant, [field]: url });
      alert(`${field} updated successfully!`);
    } catch (error: any) {
      alert(error.message || "Failed to upload image");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!selectedRestaurant) return;
    try {
      await apiFetch(`/restaurants/${selectedRestaurant._id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !selectedRestaurant.isActive })
      });
      setRestaurants(restaurants.map(r => r._id === selectedRestaurant._id ? { ...r, isActive: !selectedRestaurant.isActive } : r));
      setSelectedRestaurant({ ...selectedRestaurant, isActive: !selectedRestaurant.isActive });
    } catch (error) {
      alert("Failed to update block status");
    }
  };

  const filteredRestaurants = restaurants.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="restaurant-overview">
      <div className="page-header">
        <div>
          <h1>Restaurants</h1>
          <p>Manage and monitor all registered restaurants</p>
        </div>
        <Link to="/restaurants/onboard" className="btn-primary">
          <Plus size={20} />
          <span>Onboard Restaurant</span>
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search restaurants..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading restaurants...</div>
      ) : (
        <div className="restaurant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredRestaurants.map((restaurant) => (
            <div 
              key={restaurant._id} 
              className="glass-panel restaurant-card" 
              onClick={() => handleCardClick(restaurant)}
              style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 min-content', minWidth: '150px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0 }}>
                    {restaurant.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ wordBreak: 'break-word' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{restaurant.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click to manage menu</p>
                  </div>
                </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span 
                      style={{ 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: restaurant.isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: restaurant.isOnline ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {restaurant.isOnline ? 'Online' : 'Offline'}
                    </span>
                    <button 
                      onClick={(e) => toggleStatus(e, restaurant._id, restaurant.isActive)}
                      style={{ 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: restaurant.isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: restaurant.isActive ? '#3b82f6' : '#6b7280'
                      }}
                    >
                      {restaurant.isActive ? 'Active' : 'Blocked'}
                    </button>
                  <button
                    onClick={(e) => openEditModal(e, restaurant)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid #3b82f6',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: '#3b82f6'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => deleteRestaurant(e, restaurant._id, restaurant.name)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid #ef4444',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: '#ef4444'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Store size={14} /> Total Orders
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{restaurant.orderCount || 0}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> Amount Paid
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>₹{restaurant.walletBalance || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && selectedRestaurant && (
        <div className="modal-overlay" style={{ position: 'fixed', top: '70px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ×
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Edit Restaurant Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                </div>
                <button onClick={handleSaveChanges} disabled={isUpdating} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {isUpdating ? 'Saving...' : 'Save Name & Phone'}
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Email:</strong> {selectedRestaurant.email || 'N/A'}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Address:</strong> {selectedRestaurant.address || 'N/A'}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Status:</strong> {selectedRestaurant.isActive ? 'Active' : 'Blocked'}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>UPI:</strong> {selectedRestaurant.upi || 'N/A'}</p>
              </div>
            </div>

            <h3 style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Documents & Images (Click to change)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Logo */}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logo</p>
                {selectedRestaurant.logo ? (
                  <img src={selectedRestaurant.logo} alt="Logo" style={{ width: '100%', height: '80px', objectFit: 'contain', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'gray', fontSize: '0.8rem' }}>No Logo</div>
                )}
                <label style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Upload New
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload('logo', e.target.files[0])} disabled={isUpdating} />
                </label>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Max: 2MB (Rec &lt;1MB)</span>
              </div>

              {/* License (Passbook mapping) */}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>License / Document</p>
                {selectedRestaurant.accountDetail ? (
                  <img src={selectedRestaurant.accountDetail} alt="License" style={{ width: '100%', height: '80px', objectFit: 'contain', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'gray', fontSize: '0.8rem' }}>No License</div>
                )}
                <label style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Upload New
                  <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && handleImageUpload('accountDetail', e.target.files[0])} disabled={isUpdating} />
                </label>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Max: 5MB (PDF/Image)</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={handleBlockToggle}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '8px', 
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: selectedRestaurant.isActive ? '#ef4444' : '#10b981',
                  color: '#fff'
                }}
              >
                {selectedRestaurant.isActive ? 'Block Restaurant' : 'Unblock Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantOverview;
