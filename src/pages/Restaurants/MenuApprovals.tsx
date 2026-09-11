import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { CheckCircle, XCircle, Image as ImageIcon, Trash2, History, Clock } from 'lucide-react';
import './MenuApprovals.css';

interface PortionOption {
  name: string;
  price?: number | string;
  b2bPrice?: number | string;
  isDefault?: boolean;
}

interface PendingItem {
  restaurantId: string;
  restaurantName: string;
  _id: string;
  name: string;
  description: string;
  category?: string;
  b2bPrice: number;
  price?: number;
  portion?: string;
  portions?: PortionOption[];
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
  // Stores prices keyed by `${itemId}_${portionName}` or `${itemId}`
  const [portionPrices, setPortionPrices] = useState<Record<string, string>>({});

  const fetchItems = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const res = await apiFetch('/restaurants/admin/menu/pending');
        if (res.success) {
          setPendingItems(res.pendingItems || []);
          const initialPrices: Record<string, string> = {};
          (res.pendingItems || []).forEach((item: PendingItem) => {
            if (item.portions && item.portions.length > 0) {
              item.portions.forEach(p => {
                const key = `${item._id}_${p.name}`;
                initialPrices[key] = p.price ? p.price.toString() : '';
              });
            } else {
              initialPrices[item._id] = item.b2bPrice ? item.b2bPrice.toString() : '';
            }
          });
          setPortionPrices(initialPrices);
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

  const handlePortionPriceChange = (itemId: string, portionName: string, value: string) => {
    const key = `${itemId}_${portionName}`;
    setPortionPrices(prev => ({ ...prev, [key]: value }));
  };

  const handleApproval = async (item: PendingItem, status: 'approved' | 'rejected' | 'deleted') => {
    if (status === 'approved' && item.approvalStatus !== 'delete_pending') {
      if (item.portions && item.portions.length > 0) {
        for (const p of item.portions) {
          const key = `${item._id}_${p.name}`;
          const val = portionPrices[key];
          if (!val || isNaN(Number(val)) || Number(val) <= 0) {
            alert(`Please enter a valid selling price for portion: ${p.name}`);
            return;
          }
        }
      } else {
        const val = portionPrices[item._id];
        if (!val || isNaN(Number(val))) {
          alert('Please enter a valid selling price to approve this item.');
          return;
        }
      }
    }

    try {
      let payloadPortions = undefined;
      let primaryPrice = 0;

      if (item.portions && item.portions.length > 0) {
        payloadPortions = item.portions.map(p => {
          const key = `${item._id}_${p.name}`;
          const priceVal = Number(portionPrices[key]) || 0;
          return {
            name: p.name,
            b2bPrice: Number(p.b2bPrice) || 0,
            price: status === 'approved' ? priceVal : 0,
            isDefault: !!p.isDefault
          };
        });
        const def = payloadPortions.find(p => p.isDefault) || payloadPortions[0];
        primaryPrice = def.price;
      } else {
        primaryPrice = status === 'approved' ? (Number(portionPrices[item._id]) || 0) : 0;
      }

      const payload: any = {
        approvalStatus: status,
        price: primaryPrice
      };
      if (payloadPortions) {
        payload.portions = payloadPortions;
      }

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
          <p className="page-subtitle">Review menu additions, portion pricing & deletion requests</p>
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
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {item.category && (
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
                        {item.category}
                      </span>
                    )}
                    <span className={`food-type-badge ${item.foodType}`}>{item.foodType.toUpperCase()}</span>
                  </div>
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
                  
                  <div className="item-details" style={{ flex: 1 }}>
                    <h3 className="item-title">{item.name}</h3>
                    <p className="item-desc">{item.description || 'No description provided'}</p>
                    
                    {/* Multi-Portion B2B & Price Inputs */}
                    <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                        Portion Variants & Pricing
                      </span>
                      
                      {item.portions && item.portions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {item.portions.map((p, pIdx) => {
                            const key = `${item._id}_${p.name}`;
                            return (
                              <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <div style={{ flex: 1 }}>
                                  <strong>{p.name}{p.isDefault ? ' (Def)' : ''}</strong>
                                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>B2B: ₹{p.b2bPrice}</div>
                                </div>
                                {item.approvalStatus !== 'delete_pending' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sell ₹</span>
                                    <input
                                      type="number"
                                      value={portionPrices[key] ?? ''}
                                      onChange={e => handlePortionPriceChange(item._id, p.name, e.target.value)}
                                      placeholder="Sell ₹"
                                      style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #4b5563', background: '#1f2937', color: 'white', fontSize: '0.85rem' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>B2B Price: </span>
                            <strong>₹{item.b2bPrice || 0}</strong>
                          </div>
                          {item.approvalStatus !== 'delete_pending' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sell ₹</span>
                              <input
                                type="number"
                                value={portionPrices[item._id] ?? ''}
                                onChange={e => setPortionPrices(prev => ({ ...prev, [item._id]: e.target.value }))}
                                placeholder="Sell ₹"
                                style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #4b5563', background: '#1f2937', color: 'white', fontSize: '0.85rem' }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="approval-card-footer">
                  {item.approvalStatus === 'delete_pending' ? (
                    <div className="action-buttons full-width" style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleApproval(item, 'approved')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', color: '#374151', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        <XCircle size={18} />
                        Reject Deletion
                      </button>
                      <button 
                        className="btn btn-reject"
                        onClick={() => handleApproval(item, 'deleted')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        <CheckCircle size={18} />
                        Approve Deletion
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons" style={{ width: '100%', display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn btn-reject"
                        onClick={() => handleApproval(item, 'rejected')}
                        style={{ flex: 1 }}
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                      <button 
                        className="btn btn-approve"
                        onClick={() => handleApproval(item, 'approved')}
                        style={{ flex: 1 }}
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                    </div>
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
                  <div className="badges-right" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                  
                  <div className="item-details" style={{ flex: 1 }}>
                    <h3 className="item-title">{item.name}</h3>
                    <p className="item-desc">{item.description || 'No description provided'}</p>
                    
                    <div style={{ marginTop: '0.5rem' }}>
                      {item.portions && item.portions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem' }}>
                          {item.portions.map((p, pi) => (
                            <div key={pi} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                              <span><strong>{p.name}:</strong> B2B ₹{p.b2bPrice}</span>
                              {p.price && <strong style={{ color: '#059669' }}>Sell ₹{p.price}</strong>}
                            </div>
                          ))}
                        </div>
                      ) : (
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
