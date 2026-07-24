import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../utils/api';
import './RestaurantPayouts.css';

interface Restaurant {
  _id: string;
  name: string;
  phone: string;
  upi?: string;
  walletBalance: number;
  isActive: boolean;
  storeType: string;
}

const RestaurantPayouts = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [deductAmount, setDeductAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/restaurants/payouts');
      setRestaurants(data.restaurants || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurant payouts');
    } finally {
      setLoading(false);
    }
  };

  const openProcessModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setDeductAmount('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedRestaurant(null);
    setIsModalOpen(false);
    setDeductAmount('');
  };

  const handleProcessSubmit = async () => {
    if (!selectedRestaurant) return;
    
    const amount = Number(deductAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    if (amount > selectedRestaurant.walletBalance) {
      alert("Cannot deduct more than the current wallet balance");
      return;
    }

    setIsProcessing(true);
    try {
      await apiFetch('/admin/restaurants/payouts/process', {
        method: 'PATCH',
        body: JSON.stringify({
          restaurantId: selectedRestaurant._id,
          deductAmount: amount,
        }),
      });
      setIsModalOpen(false);
      fetchRestaurants(); // refresh list to get updated balances
      alert(`Successfully processed payout of ₹${amount} for ${selectedRestaurant.name}`);
    } catch (err: any) {
      alert(err.message || 'Failed to process payout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="restaurant-payouts-container">
      <div className="payouts-header">
        <h1>Restaurant Payouts</h1>
        <p>Track pending balances and process manual UPI payments to restaurants.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="glass-panel">
        {loading ? (
          <div className="loading-state">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="empty-state">No restaurants found.</div>
        ) : (
          <table className="rest-payouts-table">
            <thead>
              <tr>
                <th>Restaurant Name</th>
                <th>Store Type</th>
                <th>Phone</th>
                <th>UPI ID</th>
                <th>Pending Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map(rest => (
                <tr key={rest._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{rest.name}</div>
                    {!rest.isActive && <div className="error-text" style={{ fontSize: '0.85rem' }}>(Offline)</div>}
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{rest.storeType}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{rest.phone || 'N/A'}</td>
                  <td>{rest.upi || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Not set</span>}</td>
                  <td className="amount" style={{ fontSize: '1.1rem' }}>
                    ₹{rest.walletBalance?.toFixed(2) || '0.00'}
                  </td>
                  <td>
                    <button 
                      className="btn-process" 
                      onClick={() => openProcessModal(rest)}
                      disabled={rest.walletBalance <= 0}
                    >
                      Process Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Payment Modal */}
      {isModalOpen && selectedRestaurant && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Process Payout: {selectedRestaurant.name}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="stats-bar">
                <div className="stat-item" style={{ flex: 1 }}>
                  <span className="stat-label">Pending Balance</span>
                  <span className="stat-value earning">₹{selectedRestaurant.walletBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="stat-item" style={{ flex: 2 }}>
                  <span className="stat-label">UPI ID</span>
                  <span className="stat-value" style={{ fontSize: '1.2rem', color: selectedRestaurant.upi ? 'var(--text-primary)' : '#ef4444' }}>
                    {selectedRestaurant.upi || 'NO UPI ID PROVIDED'}
                  </span>
                </div>
              </div>

              <div className="admin-actions">
                <label>Amount to Deduct (₹)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 5000" 
                  value={deductAmount} 
                  onChange={(e) => setDeductAmount(e.target.value)} 
                  max={selectedRestaurant.walletBalance}
                  min={1}
                  autoFocus
                />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Enter the exact amount you paid via UPI. This will be subtracted from their pending balance.
                </p>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button 
                  className="btn-submit" 
                  disabled={!deductAmount || Number(deductAmount) <= 0 || Number(deductAmount) > selectedRestaurant.walletBalance || isProcessing} 
                  onClick={handleProcessSubmit}
                >
                  {isProcessing ? 'Processing...' : `Deduct ₹${deductAmount || 0}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RestaurantPayouts;
