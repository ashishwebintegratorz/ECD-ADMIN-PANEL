import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import './SpecialDishes.css';

interface SpecialDish {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category?: string;
  isActive: boolean;
  ordering: number;
}

const SpecialDishes = () => {
  const [dishes, setDishes] = useState<SpecialDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [ordering, setOrdering] = useState('0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/popular-dishes');
      setDishes(data.dishes || data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch special dishes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select an image");
      return;
    }
    if (!name) {
      alert("Please enter a dish name");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('ordering', ordering);
      formData.append('image', selectedFile);

      await apiFetch('/popular-dishes', {
        method: 'POST',
        body: formData
      });

      closeModal();
      fetchDishes();
    } catch (err: any) {
      alert(err.message || 'Error uploading dish');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, dishName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${dishName}?`)) return;

    try {
      await apiFetch(`/popular-dishes/${id}`, { method: 'DELETE' });
      setDishes(dishes.filter(d => d._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete dish');
    }
  };

  const openModal = () => {
    setName('');
    setCategory('');
    setOrdering('0');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAddingCategory(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="special-dishes-container">
      <div className="dishes-header">
        <div>
          <h1>Special Dishes</h1>
          <p>Manage the highlighted popular dishes displayed on the user app home screen.</p>
        </div>
        <button className="btn-add" onClick={openModal}>
          <Plus size={20} /> Add Special Dish
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state glass-panel">Loading special dishes...</div>
      ) : dishes.length === 0 ? (
        <div className="empty-state glass-panel">No special dishes found. Add one to get started!</div>
      ) : (
        <div className="dishes-grid">
          {dishes.map(dish => (
            <div key={dish._id} className="dish-card">
              <div className="dish-image-container">
                <img src={dish.image} alt={dish.name} className="dish-image" />
                <div className="dish-actions">
                  <button className="btn-icon delete" onClick={() => handleDelete(dish._id, dish.name)} title="Delete Dish">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="dish-info">
                <div className="dish-category">{dish.category || 'General'}</div>
                <h3 className="dish-name">{dish.name}</h3>
                <div className="dish-status status-active">Active</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && createPortal(
        <div className="sd-modal-overlay" onClick={closeModal}>
          <div className="sd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h2>Add Special Dish</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="sd-modal-body">
                <div className="form-group">
                  <label>Dish Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Special Chicken Biryani"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  {isAddingCategory ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="New Category Name"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingCategory(false);
                          setCategory('');
                        }}
                        style={{ padding: '0 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }}
                      >
                        <option value="">-- Select Category --</option>
                        {Array.from(new Set(dishes.map(d => d.category).filter(Boolean))).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingCategory(true);
                          setCategory('');
                        }}
                        style={{ padding: '0 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                      >
                        <Plus size={16} /> Add New
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Order Priority</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={ordering}
                    onChange={e => setOrdering(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Dish Image *</label>
                  {previewUrl ? (
                    <div className="image-preview">
                      <img src={previewUrl} alt="Preview" />
                    </div>
                  ) : (
                    <div className="image-preview" style={{ border: '1px dashed var(--border-color)', opacity: 0.5 }}>
                      <ImageIcon size={48} />
                    </div>
                  )}

                  <div className="file-input-wrapper">
                    <button type="button" className="btn-upload" style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)' }}>
                      <ImageIcon size={20} />
                      {selectedFile ? selectedFile.name : "Click here to choose an Image"}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required={!selectedFile}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              <div className="sd-modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={isSubmitting || !selectedFile || !name}>
                  {isSubmitting ? 'Uploading...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SpecialDishes;
