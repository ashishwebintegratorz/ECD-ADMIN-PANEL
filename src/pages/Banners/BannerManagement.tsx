import React, { useState, useEffect, useRef } from 'react';
import { Image, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import './BannerManagement.css';
import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';

interface Banner {
  _id: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
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

  const handleAddBannerClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, { maxSizeMB: 2, recommendedSizeMB: 1, typeDescription: 'JPG, PNG, WEBP' });
    if (!validation.isValid) {
      alert(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload image first
      const imageUrl = await uploadFile(file, { maxSizeMB: 2, recommendedSizeMB: 1 });
      
      // Create banner record
      await apiFetch('/banners', {
        method: 'POST',
        body: JSON.stringify({ imageUrl })
      });
      
      // Refresh list
      fetchBanners();
      alert('Banner uploaded successfully!');
    } catch (error: any) {
      console.error('Failed to upload banner:', error);
      alert(error.message || 'Failed to upload banner.');
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  return (
    <div className="banners-container animate-fade-in">
      <div className="banners-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <Image size={28} className="text-primary" />
            Banner Management
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '6px', fontSize: '0.875rem' }}>
            Manage homepage promotional banners. (Max size: 2 MB, Recommended: under 1 MB • JPG, PNG, WEBP)
          </p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange}
        />
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={handleAddBannerClick}
          disabled={isUploading}
        >
          {isUploading ? <span className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span> : <Plus size={18} />}
          {isUploading ? 'Uploading...' : 'Add Banner'}
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
              <div className="banner-actions">
                <button 
                  className={`btn-action ${banner.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                  onClick={() => handleToggleStatus(banner._id)}
                  title={banner.isActive ? 'Deactivate' : 'Activate'}
                >
                  {banner.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                  <span>{banner.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button 
                  className="btn-action btn-delete"
                  onClick={() => handleDeleteBanner(banner._id)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
