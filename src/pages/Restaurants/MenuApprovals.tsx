import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CheckCircle, XCircle, Image as ImageIcon, Trash2, History, Clock } from 'lucide-react';
import './MenuApprovals.css';

interface PendingItem {
  restaurantId: string;
  restaurantName: string;
  _id: string;
  name: string;
  description: string;
  b2bPrice: number;
  price?: number;
  image: string;
  foodType: string;
  approvalStatus: string;
  deleteReason?: string;
  updatedAt?: string;
}

const MenuApprovals = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'past'>('pending');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pastItems, setPastItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({}); // itemId -> price input

  const fetchItems = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const res = await apiFetch('/restaurants/admin/menu/pending');
        if (res.success) {
          setPendingItems(res.pendingItems || []);
          const initialPrices: Record<string, string> = {};
          (res.pendingItems || []).forEach((item: PendingItem) => {
            initialPrices[item._id] = item.b2bPrice ? item.b2bPrice.toString() : '';
          });
          setPrices(initialPrices);
        }
      } else {
        const res = await apiFetch('/restaurants/admin/menu/history');
        if (res.success) {
          setPastItems(res.pastItems || []);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handlePriceChange = (id: string, value: string) => {
    setPrices(prev => ({ ...prev, [id]: value }));
  };

  const handleApproval = async (item: PendingItem, status: 'approved' | 'rejected' | 'deleted') => {
    const sellingPrice = prices[item._id];
    
    if (status === 'approved' && item.approvalStatus !== 'delete_pending' && (!sellingPrice || isNaN(Number(sellingPrice)))) {
      alert('Please enter a valid selling price to approve this item.');
      return;
    }

    try {
      const payload = {
        approvalStatus: status,
        price: status === 'approved' ? Number(sellingPrice) : 0
      };

      const res = await apiFetch(`/restaurants/admin/menu/approve/${item.restaurantId}/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        if (activeTab === 'pending') {
          setPendingItems(prev => prev.filter(p => p._id !== item._id));
        }
      } else {
        alert(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while updating');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading {activeTab} approvals...</div>;
  }

  return (
    <div className="menu-approvals-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Approvals</h1>
          <p className="page-subtitle">Review menu additions and deletion requests</p>
        </div>
        <div className="header-tabs" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ccc', background: activeTab === 'pending' ? '#e0f2fe' : 'transparent', cursor: 'pointer' }}
          >
            <Clock size={18} />
            Pending
            {pendingItems.length > 0 && activeTab === 'pending' && <span className="tab-badge" style={{ marginLeft: '0.5rem', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>{pendingItems.length}</span>}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ccc', background: activeTab === 'past' ? '#e0f2fe' : 'transparent', cursor: 'pointer' }}
          >
            <History size={18} />
            Past Approvals
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        pendingItems.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-icon" />
            <h3>All Caught Up!</h3>
            <p>There are no pending menu items to approve right now.</p>
          </div>
        ) : (
          <div className="approvals-grid">
            {pendingItems.map(item => (
              <div key={item._id} className={`approval-card glass-panel ${item.approvalStatus === 'delete_pending' ? 'danger-border' : ''}`} style={item.approvalStatus === 'delete_pending' ? { border: '2px solid #ef4444' } : {}}>
                <div className="approval-card-header">
                  <span className="restaurant-badge">{item.restaurantName}</span>
                  <span className={`food-type-badge ${item.foodType}`}>{item.foodType.toUpperCase()}</span>
                </div>
                
                {item.approvalStatus === 'delete_pending' && (
                  <div className="delete-request-banner" style={{ background: '#fee2e2', color: '#991b1b', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <Trash2 size={16} />
                    <span><strong>Deletion Requested:</strong> {item.deleteReason}</span>
                  </div>
                )}
                
                <div className="approval-card-body">
                  <div className="item-image-wrapper">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="item-image" />
                    ) : (
                      <div className="item-image-placeholder">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-title">{item.name}</h3>
                    <p className="item-desc">{item.description || 'No description provided'}</p>
                    
                    <div className="price-info">
                      <div className="b2b-price">
                        <span>B2B Price:</span>
                        <strong>₹{item.b2bPrice || (item as any).price || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="approval-card-footer">
                  {item.approvalStatus === 'delete_pending' ? (
                    <div className="action-buttons full-width" style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleApproval(item, 'approved')} // reject deletion means return to approved
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', color: '#374151', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        <XCircle size={18} />
                        Reject Deletion
                      </button>
                      <button 
                        className="btn btn-reject"
                        onClick={() => handleApproval(item, 'deleted')} // approve deletion means permanently delete
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        <CheckCircle size={18} />
                        Approve Deletion
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="selling-price-input">
                        <label>Set Selling Price (₹)</label>
                        <input 
                          type="number" 
                          value={prices[item._id] || ''} 
                          onChange={(e) => handlePriceChange(item._id, e.target.value)}
                          placeholder="e.g. 150"
                        />
                      </div>
                      
                      <div className="action-buttons">
                        <button 
                          className="btn btn-reject"
                          onClick={() => handleApproval(item, 'rejected')}
                        >
                          <XCircle size={18} />
                          Reject
                        </button>
                        <button 
                          className="btn btn-approve"
                          onClick={() => handleApproval(item, 'approved')}
                        >
                          <CheckCircle size={18} />
                          Approve
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pastItems.length === 0 ? (
          <div className="empty-state">
            <History size={48} className="empty-icon" />
            <h3>No Past Approvals</h3>
            <p>You haven't approved or rejected any items yet.</p>
          </div>
        ) : (
          <div className="approvals-grid">
            {pastItems.map(item => (
              <div key={item._id} className="approval-card glass-panel read-only-card">
                <div className="approval-card-header">
                  <span className="restaurant-badge">{item.restaurantName}</span>
                  <div className="badges-right">
                    <span className={`status-badge ${item.approvalStatus}`} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', background: item.approvalStatus === 'approved' ? '#dcfce7' : item.approvalStatus === 'deleted' ? '#f3f4f6' : '#fee2e2', color: item.approvalStatus === 'approved' ? '#166534' : item.approvalStatus === 'deleted' ? '#4b5563' : '#991b1b' }}>
                      {item.approvalStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {item.approvalStatus === 'deleted' && item.deleteReason && (
                  <div className="delete-request-banner" style={{ background: '#f3f4f6', color: '#4b5563', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid #e5e7eb' }}>
                    <Trash2 size={16} />
                    <span><strong>Deletion Reason:</strong> {item.deleteReason}</span>
                  </div>
                )}
                
                <div className="approval-card-body">
                  <div className="item-image-wrapper">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="item-image" />
                    ) : (
                      <div className="item-image-placeholder">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-title">{item.name}</h3>
                    <p className="item-desc">{item.description || 'No description provided'}</p>
                    
                    <div className="price-info split" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="b2b-price">
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>B2B Price:</span>
                        <strong>₹{item.b2bPrice}</strong>
                      </div>
                      {item.approvalStatus === 'approved' && item.price && (
                        <div className="selling-price" style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Selling Price:</span>
                          <strong style={{ color: '#059669' }}>₹{item.price}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default MenuApprovals;
