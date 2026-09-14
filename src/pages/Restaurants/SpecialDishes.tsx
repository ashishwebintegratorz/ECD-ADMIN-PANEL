import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';
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

const DEFAULT_CATEGORIES = [
  'Main Course',
  'Starter',
  'Biryani',
  'Pizza',
  'Burger',
  'Chinese',
  'North Indian',
  'South Indian',
  'Fast Food',
  'Desserts',
  'Beverages',
  'Tandoori & Grill',
  'Rolls & Wraps',
  'Snacks'
];

const SpecialDishes = () => {
  const [dishes, setDishes] = useState<SpecialDish[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<SpecialDish | null>(null);
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
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/categories');
      if (res && res.categories && Array.isArray(res.categories)) {
        const catNames = res.categories
          .map((c: any) => (typeof c === 'string' ? c : c.name))
          .filter(Boolean);
        setApiCategories(catNames);
      }
    } catch {
      // Fallback silently if categories endpoint is optional
    }
  };

  // Combine and deduplicate categories
  const allAvailableCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...apiCategories,
      ...dishes.map(d => d.category).filter(Boolean) as string[]
    ])
  ).sort();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
      if (!validation.isValid) {
        alert(validation.error);
        e.target.value = '';
        setSelectedFile(null);
        setPreviewUrl(editingDish ? editingDish.image : null);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a dish name");
      return;
    }
    if (!editingDish && !selectedFile) {
      alert("Please select an image");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim() || 'General');
      formData.append('ordering', ordering || '0');
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingDish) {
        await apiFetch(`/popular-dishes/${editingDish._id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        await apiFetch('/popular-dishes', {
          method: 'POST',
          body: formData
        });
      }

      closeModal();
      fetchDishes();
    } catch (err: any) {
      alert(err.message || 'Error saving dish');
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

  const openAddModal = () => {
    setEditingDish(null);
    setName('');
    setCategory('');
    setOrdering('0');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAddingCategory(false);
    setIsModalOpen(true);
  };

  const openEditModal = (dish: SpecialDish) => {
    setEditingDish(dish);
    setName(dish.name);
    setCategory(dish.category || '');
    setOrdering(dish.ordering?.toString() || '0');
    setSelectedFile(null);
    setPreviewUrl(dish.image);
    setIsAddingCategory(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDish(null);
  };

  return (
    <div className="special-dishes-container">
      <div className="dishes-header">
        <div>
          <h1>Special Dishes</h1>
          <p>Manage the highlighted popular dishes displayed on the user app home screen.</p>
        </div>
        <button className="btn-add" onClick={openAddModal}>
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
                  <button className="btn-icon edit" onClick={() => openEditModal(dish)} title="Edit Dish">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon delete" onClick={() => handleDelete(dish._id, dish.name)} title="Delete Dish">
                    <Trash2 size={16} />
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

      {/* Add / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="sd-modal-overlay" onClick={closeModal}>
          <div className="sd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h2>{editingDish ? 'Edit Special Dish' : 'Add Special Dish'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleFormSubmit}>
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
                        placeholder="New Category Name (e.g. Rolls, Shakes)"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingCategory(false);
                        }}
                        style={{ padding: '0 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Select Existing
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
                        {allAvailableCategories.map(cat => (
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
                  <label>Dish Image {editingDish ? '(Leave unchanged or pick new)' : '*'}</label>
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
                      {selectedFile ? selectedFile.name : (editingDish ? "Click to change Image" : "Click here to choose an Image")}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required={!editingDish && !selectedFile}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', display: 'block', textAlign: 'center' }}>
                    Max size: 2 MB (Recommended: under 1 MB for high speed) • JPG, PNG, WEBP
                  </span>
                </div>
              </div>

              <div className="sd-modal-footer">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={isSubmitting || (!editingDish && !selectedFile) || !name.trim()}>
                  {isSubmitting ? 'Saving...' : (editingDish ? 'Update Dish' : 'Add Dish')}
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
