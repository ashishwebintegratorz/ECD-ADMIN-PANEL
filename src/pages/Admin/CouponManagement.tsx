import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Trash2, Edit2, Search } from 'lucide-react';
import './CouponManagement.css';
import { apiFetch } from '../../utils/api';

interface Coupon {
  _id: string;
  code: string;
  heading?: string;
  subHeading?: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  validFrom?: string;
  validTo?: string;
  active: boolean;
}

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    heading: '',
    subHeading: '',
    description: '',
    discountType: 'percent',
    discountValue: '',
    minOrderValue: '',
    maxDiscountValue: '',
    usageLimit: '',
    perUserLimit: '',
    validFrom: '',
    validTo: '',
    active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/coupons/admin/all');
      if (data.coupons) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      alert('Failed to load coupons.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      code: '',
      heading: '',
      subHeading: '',
      description: '',
      discountType: 'percent',
      discountValue: '',
      minOrderValue: '',
      maxDiscountValue: '',
      usageLimit: '',
      perUserLimit: '',
      validFrom: '',
      validTo: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingId(coupon._id);
    setFormData({
      code: coupon.code,
      heading: coupon.heading || '',
      subHeading: coupon.subHeading || '',
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue?.toString() || '',
      maxDiscountValue: coupon.maxDiscountValue?.toString() || '',
      usageLimit: coupon.usageLimit?.toString() || '',
      perUserLimit: coupon.perUserLimit?.toString() || '',
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : '',
      validTo: coupon.validTo ? new Date(coupon.validTo).toISOString().slice(0, 16) : '',
      active: coupon.active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : '',
        validTo: formData.validTo ? new Date(formData.validTo).toISOString() : '',
      };

      if (editingId) {
        await apiFetch(`/coupons/admin/update/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(dataToSubmit)
        });
        alert('Coupon updated successfully!');
      } else {
        await apiFetch('/coupons/admin/create', {
          method: 'POST',
          body: JSON.stringify(dataToSubmit)
        });
        alert('Coupon created successfully!');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (error: any) {
      console.error('Failed to save coupon:', error);
      alert(error.message || 'Failed to save coupon.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    
    try {
      await apiFetch(`/coupons/admin/delete/${id}`, { method: 'DELETE' });
      fetchCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      alert('Failed to delete coupon.');
    }
  };

  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="coupons-container animate-fade-in">
      <div className="coupons-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <Ticket size={28} className="text-primary" style={{ color: '#22C55E' }} />
            Coupon Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage discount codes and promotions.</p>
        </div>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#22C55E' }}
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Coupon
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="loader"></div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Limit / Used</th>
                  <th>Valid Till</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.length > 0 ? (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon._id}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#10b981' }}>{coupon.code}</div>
                        {coupon.heading && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{coupon.heading}</div>}
                      </td>
                      <td>
                        {coupon.discountType === 'percent' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                        {coupon.maxDiscountValue ? <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block' }}>Up to ₹{coupon.maxDiscountValue}</span> : null}
                      </td>
                      <td>
                        {coupon.usageLimit ? `${coupon.usedCount} / ${coupon.usageLimit}` : `${coupon.usedCount} (unlimited)`}
                      </td>
                      <td>
                        {coupon.validTo ? new Date(coupon.validTo).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td>
                        <span className={`status-badge ${coupon.active ? 'status-active' : 'status-inactive'}`}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => openEditModal(coupon)}
                            style={{ padding: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(coupon._id)}
                            style={{ padding: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      No coupons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form-container">
              <div className="modal-body">
                <div className="form-row">
                <div className="form-group">
                  <label>Coupon Code *</label>
                  <input type="text" name="code" value={formData.code} onChange={handleInputChange} required style={{ textTransform: 'uppercase' }} disabled={!!editingId} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '8px' }}>
                    <input type="checkbox" name="active" checked={formData.active} onChange={handleInputChange} id="active-check" style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="active-check" style={{ margin: 0 }}>Active</label>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Heading</label>
                  <input type="text" name="heading" value={formData.heading} onChange={handleInputChange} placeholder="e.g. 50% OFF" />
                </div>
                <div className="form-group">
                  <label>Sub Heading</label>
                  <input type="text" name="subHeading" value={formData.subHeading} onChange={handleInputChange} placeholder="e.g. on orders above ₹200" />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} placeholder="Detailed terms and conditions..."></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type *</label>
                  <select name="discountType" value={formData.discountType} onChange={handleInputChange} required>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value *</label>
                  <input type="number" name="discountValue" value={formData.discountValue} onChange={handleInputChange} required min="0" step="any" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Order Value (₹)</label>
                  <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleInputChange} min="0" />
                </div>
                <div className="form-group">
                  <label>Max Discount (₹)</label>
                  <input type="number" name="maxDiscountValue" value={formData.maxDiscountValue} onChange={handleInputChange} min="0" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Total Usage Limit</label>
                  <input type="number" name="usageLimit" value={formData.usageLimit} onChange={handleInputChange} min="1" placeholder="Leave empty for unlimited" />
                </div>
                <div className="form-group">
                  <label>Limit Per User</label>
                  <input type="number" name="perUserLimit" value={formData.perUserLimit} onChange={handleInputChange} min="1" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valid From</label>
                  <input type="datetime-local" name="validFrom" value={formData.validFrom} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Valid To</label>
                  <input type="datetime-local" name="validTo" value={formData.validTo} onChange={handleInputChange} />
                </div>
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#22C55E' }}>{editingId ? 'Update Coupon' : 'Create Coupon'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement;
