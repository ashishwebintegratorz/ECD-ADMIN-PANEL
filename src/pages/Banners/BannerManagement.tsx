import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Image, Plus, Trash2, CheckCircle, XCircle, Link as LinkIcon, Edit2, Store, Tag, Globe } from 'lucide-react';
import './BannerManagement.css';
import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';

interface Banner {
  _id: string;
  imageUrl: string;
  isActive: boolean;
  linkType?: 'none' | 'restaurant' | 'category' | 'url';
  targetId?: string;
  targetName?: string;
  linkUrl?: string;
  createdAt: string;
}

interface RestaurantOption {
  _id: string;
  name: string;
  slug?: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug?: string;
}

const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<'none' | 'restaurant' | 'category' | 'url'>('none');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    fetchBanners();
    fetchLinkOptions();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/banners/admin');
      if (data.success) {
        setBanners(data.banners);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      alert('Failed to load banners.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLinkOptions = async () => {
    setIsLoadingOptions(true);
    try {
      // Fetch restaurants using list with all=true or admin/all
      let restList: any[] = [];
      try {
        const restData = await apiFetch('/restaurants/list?limit=1000&all=true');
        if (restData?.restaurants) restList = restData.restaurants;
      } catch {
        try {
          const restData2 = await apiFetch('/restaurants/all');
          if (restData2?.restaurants) restList = restData2.restaurants;
        } catch {
          const restData3 = await apiFetch('/restaurants');
          if (restData3?.restaurants) restList = restData3.restaurants;
        }
      }

      if (restList && restList.length > 0) {
        setRestaurants(restList.map((r: any) => ({
          _id: r._id || r.id,
          name: r.name,
          slug: r.slug,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }

    try {
      // Fetch categories
      const catData = await apiFetch('/categories');
      const catList = Array.isArray(catData) ? catData : (catData?.categories || catData?.data || []);
      if (catList.length > 0) {
        setCategories(catList.map((c: any) => ({
          _id: c._id || c.slug || c.name,
          name: typeof c === 'string' ? c : (c.name || c.title),
          slug: c.slug || c.name,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const openAddModal = () => {
    if (restaurants.length === 0) {
      fetchLinkOptions();
    }
    setEditingBanner(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setLinkType('none');
    setTargetId('');
    setTargetName('');
    setLinkUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    if (restaurants.length === 0) {
      fetchLinkOptions();
    }
    setEditingBanner(banner);
    setSelectedFile(null);
    setPreviewUrl(banner.imageUrl);
    setLinkType(banner.linkType || 'none');
    setTargetId(banner.targetId || '');
    setTargetName(banner.targetName || '');
    setLinkUrl(banner.linkUrl || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
    if (!validation.isValid) {
      alert(validation.error);
      event.target.value = '';
      setSelectedFile(null);
      setPreviewUrl(editingBanner ? editingBanner.imageUrl : null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner && !selectedFile) {
      alert('Please select a banner image');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = editingBanner ? editingBanner.imageUrl : '';
      if (selectedFile) {
        imageUrl = await uploadFile(selectedFile, { maxSizeMB: 2, recommendedSizeMB: 1 });
      }

      // Determine targetName if restaurant/category selected
      let finalTargetName = targetName;
      if (linkType === 'restaurant') {
        const found = restaurants.find(r => r._id === targetId || r.slug === targetId);
        if (found) finalTargetName = found.name;
      } else if (linkType === 'category') {
        const found = categories.find(c => c.name === targetId || c.slug === targetId || c._id === targetId);
        if (found) finalTargetName = found.name;
        else finalTargetName = targetId;
      }

      const payload = {
        imageUrl,
        linkType,
        targetId: linkType === 'url' ? linkUrl : targetId,
        targetName: finalTargetName,
        linkUrl,
      };

      if (editingBanner) {
        await apiFetch(`/banners/${editingBanner._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/banners', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      closeModal();
      fetchBanners();
      alert(editingBanner ? 'Banner updated successfully!' : 'Banner added successfully!');
    } catch (error: any) {
      console.error('Failed to save banner:', error);
      alert(error.message || 'Failed to save banner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await apiFetch(`/banners/${id}`, { method: 'DELETE' });
      fetchBanners();
    } catch (error) {
      console.error('Failed to delete banner:', error);
      alert('Failed to delete banner.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await apiFetch(`/banners/${id}/toggle`, { method: 'PATCH' });
      fetchBanners();
    } catch (error) {
      console.error('Failed to toggle banner status:', error);
      alert('Failed to toggle banner status.');
    }
  };

  const getLinkDisplay = (banner: Banner) => {
    if (!banner.linkType || banner.linkType === 'none') {
      return (
        <div className="banner-link-info">
          <LinkIcon size={14} style={{ opacity: 0.5 }} />
          <span>No Link Attached (Display Only)</span>
        </div>
      );
    }
    if (banner.linkType === 'restaurant') {
      return (
        <div className="banner-link-info">
          <Store size={14} style={{ color: 'var(--accent-primary, #10b981)' }} />
          <span>Opens Restaurant: <strong>{banner.targetName || banner.targetId || 'Restaurant'}</strong></span>
        </div>
      );
    }
    if (banner.linkType === 'category') {
      return (
        <div className="banner-link-info">
          <Tag size={14} style={{ color: '#3b82f6' }} />
          <span>Opens Category: <strong>{banner.targetName || banner.targetId || 'Category'}</strong></span>
        </div>
      );
    }
    if (banner.linkType === 'url') {
      return (
        <div className="banner-link-info">
          <Globe size={14} style={{ color: '#f59e0b' }} />
          <span>Web Link: <strong>{banner.linkUrl || banner.targetId}</strong></span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="banners-container animate-fade-in">
      <div className="banners-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <Image size={28} className="text-primary" />
            Banner Management
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '6px', fontSize: '0.875rem' }}>
            Manage homepage promotional banners & attached restaurant/offer links. (Max size: 2 MB • JPG, PNG, WEBP)
          </p>
        </div>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Banner
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="loader"></div>
        </div>
      ) : banners.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '24px' }}>
          <Image size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '8px' }}>No Banners Yet</h3>
          <p style={{ color: '#9ca3af' }}>Add a banner to display it on the user app homepage.</p>
        </div>
      ) : (
        <div className="banners-grid" style={{ marginTop: '24px' }}>
          {banners.map((banner) => (
            <div key={banner._id} className="banner-card glass-panel">
              <div className="banner-image-container">
                <img src={banner.imageUrl} alt="Banner" className="banner-image" />
                <div className={`banner-status-badge ${banner.isActive ? 'active' : 'inactive'}`}>
                  {banner.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Link Info Display */}
              {getLinkDisplay(banner)}

              <div className="banner-actions">
                <button 
                  className="btn-action btn-edit"
                  onClick={() => openEditModal(banner)}
                  title="Edit Link / Details"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button 
                  className={`btn-action ${banner.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                  onClick={() => handleToggleStatus(banner._id)}
                  title={banner.isActive ? 'Deactivate' : 'Activate'}
                >
                  {banner.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                  <span>{banner.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button 
                  className="btn-action btn-delete"
                  onClick={() => handleDeleteBanner(banner._id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && createPortal(
        <div className="bn-modal-overlay" onClick={closeModal}>
          <div className="bn-modal-content" onClick={e => e.stopPropagation()}>
            <div className="bn-modal-header">
              <h2>{editingBanner ? 'Edit Promotional Banner' : 'Add Promotional Banner'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="bn-modal-body">
                {/* Banner Image Preview / Upload */}
                <div className="bn-form-group">
                  <label className="bn-form-label">
                    Banner Image {editingBanner ? '(Leave unchanged or pick new)' : '*'}
                  </label>
                  {previewUrl ? (
                    <div className="bn-image-preview-box">
                      <img src={previewUrl} alt="Preview" />
                    </div>
                  ) : (
                    <div className="bn-image-preview-empty">
                      <Image size={36} />
                      <span>No image selected</span>
                    </div>
                  )}

                  <div className="bn-file-upload-wrapper">
                    <button type="button" className="bn-custom-file-btn">
                      <Image size={18} />
                      <span>
                        {selectedFile
                          ? selectedFile.name
                          : editingBanner
                          ? 'Click to change Banner Image'
                          : 'Click here to choose Banner Image'}
                      </span>
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required={!editingBanner && !selectedFile}
                      className="bn-file-input-overlay"
                    />
                  </div>
                  <span className="bn-form-hint">
                    Recommended: 1200x500px, under 1 MB • JPG, PNG, WEBP
                  </span>
                </div>

                {/* Link Action Type */}
                <div className="bn-form-group">
                  <label>Banner Click Action (Where should this banner go?)</label>
                  <select 
                    value={linkType} 
                    onChange={e => {
                      const val = e.target.value as any;
                      setLinkType(val);
                      setTargetId('');
                      setTargetName('');
                    }}
                  >
                    <option value="none">None (Display Only / No Click)</option>
                    <option value="restaurant">🏪 Open Specific Restaurant (Offer / Store)</option>
                    <option value="category">🍕 Open Specific Category (e.g. Pizza, Biryani)</option>
                    <option value="url">🌐 Open External Website / Custom URL</option>
                  </select>
                </div>

                {/* If Restaurant */}
                {linkType === 'restaurant' && (
                  <div className="bn-form-group">
                    <label className="bn-form-label">Select Restaurant / Store *</label>
                    <select
                      value={targetId}
                      onChange={e => {
                        const val = e.target.value;
                        setTargetId(val);
                        const rest = restaurants.find(r => r._id === val || r.slug === val);
                        if (rest) setTargetName(rest.name);
                      }}
                      required
                    >
                      {isLoadingOptions ? (
                        <option value="">Loading restaurants...</option>
                      ) : restaurants.length === 0 ? (
                        <option value="">-- No Restaurants Found --</option>
                      ) : (
                        <option value="">-- Choose a Restaurant --</option>
                      )}

                      {/* If editing a banner and targetId is not in fetched list yet, show existing selection */}
                      {targetId && !restaurants.some(r => r._id === targetId || r.slug === targetId) && (
                        <option value={targetId}>
                          {targetName || targetId} (Selected)
                        </option>
                      )}

                      {restaurants.map(r => (
                        <option key={r._id} value={r._id}>
                          {r.name} {r.slug ? `(${r.slug})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* If Category */}
                {linkType === 'category' && (
                  <div className="bn-form-group">
                    <label className="bn-form-label">Select Category / Cuisine *</label>
                    <select
                      value={targetId}
                      onChange={e => {
                        setTargetId(e.target.value);
                        setTargetName(e.target.value);
                      }}
                      required
                    >
                      <option value="">-- Choose a Category --</option>
                      {categories.map(c => (
                        <option key={c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      {/* Common fallbacks */}
                      <option value="Pizza">Pizza</option>
                      <option value="Burger">Burger</option>
                      <option value="Biryani">Biryani</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>
                )}

                {/* If URL */}
                {linkType === 'url' && (
                  <div className="bn-form-group">
                    <label className="bn-form-label">External URL / Web Link *</label>
                    <input
                      type="url"
                      placeholder="https://example.com/promo"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="bn-modal-footer">
                <button type="button" className="bn-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bn-btn-submit"
                  disabled={isSubmitting || (!editingBanner && !selectedFile)}
                >
                  {isSubmitting ? 'Saving...' : (editingBanner ? 'Update Banner' : 'Save Banner')}
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

export default BannerManagement;
