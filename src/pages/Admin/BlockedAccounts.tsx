import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import './BlockedAccounts.css';

interface SuspendedRider {
  _id: string;
  name: string;
  phone: string;
  riderId?: string;
  createdAt: string;
}

interface SuspendedRestaurant {
  _id: string;
  name: string;
  phone: string;
  address: string;
  storeType: string;
  createdAt: string;
}

const BlockedAccounts = () => {
  const [riders, setRiders] = useState<SuspendedRider[]>([]);
  const [restaurants, setRestaurants] = useState<SuspendedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab state: 'riders' | 'restaurants'
  const [activeTab, setActiveTab] = useState<'riders' | 'restaurants'>('riders');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSuspended();
  }, []);

  const fetchSuspended = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/suspended-accounts');
      setRiders(data.suspendedRiders || []);
      setRestaurants(data.suspendedRestaurants || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suspended accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockRider = async (id: string) => {
    if (!window.confirm("Are you sure you want to unblock this rider?")) return;
    
    setActionLoading(id);
    try {
      await apiFetch(`/admin/users/${id}/details`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active', isVerified: true }),
      });
      // Remove from list
      setRiders(riders.filter(r => r._id !== id));
      alert("Rider successfully unblocked!");
    } catch (err: any) {
      alert(err.message || "Failed to unblock rider");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockRestaurant = async (id: string) => {
    if (!window.confirm("Are you sure you want to unblock this restaurant?")) return;
    
    setActionLoading(id);
    try {
      await apiFetch(`/restaurants/${id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      });
      // Remove from list
      setRestaurants(restaurants.filter(r => r._id !== id));
      alert("Restaurant successfully unblocked!");
    } catch (err: any) {
      alert(err.message || "Failed to unblock restaurant");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="blocked-accounts-container">
      <div className="blocked-header">
        <h1>Blocked & Suspended Accounts</h1>
        <p>Manage and restore access for restricted riders and restaurants.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="glass-panel">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'riders' ? 'active' : ''}`}
            onClick={() => setActiveTab('riders')}
          >
            Blocked Riders ({riders.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            Blocked Restaurants ({restaurants.length})
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Loading accounts...</div>
        ) : activeTab === 'riders' ? (
          /* RIDERS TABLE */
          riders.length === 0 ? (
            <div className="empty-state">No blocked riders found.</div>
          ) : (
            <table className="blocked-table">
              <thead>
                <tr>
                  <th>Rider Details</th>
                  <th>Phone</th>
                  <th>Status & Verification</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {riders.map(rider => (
                  <tr key={rider._id}>
                    <td>
                      <div className="name-cell">{rider.name || 'Unknown'}</div>
                      <div className="id-cell">ID: {rider.riderId || 'N/A'}</div>
                    </td>
                    <td>{rider.phone}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge status-suspended" style={{ width: 'fit-content' }}>SUSPENDED</span>
                        <span className="badge unverified" style={{ width: 'fit-content' }}>UNVERIFIED</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(rider.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        className="btn-unblock" 
                        onClick={() => handleUnblockRider(rider._id)}
                        disabled={actionLoading === rider._id}
                      >
                        {actionLoading === rider._id ? 'Processing...' : 'Unblock & Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* RESTAURANTS TABLE */
          restaurants.length === 0 ? (
            <div className="empty-state">No blocked restaurants found.</div>
          ) : (
            <table className="blocked-table">
              <thead>
                <tr>
                  <th>Restaurant Details</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(restaurant => (
                  <tr key={restaurant._id}>
                    <td>
                      <div className="name-cell">{restaurant.name}</div>
                      <div className="id-cell">Type: {restaurant.storeType.toUpperCase()}</div>
                    </td>
                    <td>{restaurant.phone || 'N/A'}</td>
                    <td style={{ maxWidth: '250px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {restaurant.address}
                    </td>
                    <td>
                      <button 
                        className="btn-unblock" 
                        onClick={() => handleUnblockRestaurant(restaurant._id)}
                        disabled={actionLoading === restaurant._id}
                      >
                        {actionLoading === restaurant._id ? 'Processing...' : 'Unblock & Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};

export default BlockedAccounts;
