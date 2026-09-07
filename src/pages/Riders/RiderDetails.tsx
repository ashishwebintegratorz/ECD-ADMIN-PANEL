import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, uploadFile } from '../../utils/api';
import { validateFile } from '../../utils/fileValidation';
import './RiderDetails.css';

interface Rider {
  _id: string;
  name: string;
  phone: string;
  riderId?: string;
  isVerified: boolean;
  isOnline?: boolean;
  status: 'pending' | 'active' | 'suspended';
  avatar?: string;
  documents?: {
    aadharFront?: string;
    aadharBack?: string;
    license?: string;
  };
  createdAt: string;
}

const RiderDetails = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  // Pagination (Simple)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fullscreen Image Viewer
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRiders(page);
  }, [page]);

  const fetchRiders = async (p: number) => {
    setLoading(true);
    try {
      const [data, summaryData] = await Promise.all([
        apiFetch(`/admin/users?role=driver&page=${p}&limit=20`),
        apiFetch('/admin/riders/orders/summary').catch(() => null)
      ]);
      setRiders(data.users || []);
      setTotalPages(data.totalPages || 1);
      
      if (summaryData && summaryData.riders) {
        const smap: Record<string, string> = {};
        summaryData.riders.forEach((r: any) => {
          smap[r._id] = r.status;
        });
        setStatusMap(smap);
      }
      
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (rider: Rider) => {
    setSelectedRider(rider);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRider(null);
  };

  // --- Actions ---

  const handleStatusChange = async (newStatus: 'pending' | 'active' | 'suspended', isVerified: boolean) => {
    if (!selectedRider) return;
    setIsUpdating(true);
    try {
      const data = await apiFetch(`/admin/users/${selectedRider._id}/details`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, isVerified }),
      });
      // Update local state
      if (newStatus === 'suspended') {
        setRiders(riders.filter(r => r._id !== selectedRider._id));
        setSelectedRider(null);
        setIsModalOpen(false);
        alert('Rider successfully blocked and moved to the Blocked Accounts section.');
      } else {
        setSelectedRider({ ...selectedRider, status: newStatus, isVerified });
        setRiders(riders.map(r => r._id === selectedRider._id ? data.user : r));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update rider status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDocumentUpload = async (docType: 'aadharFront' | 'aadharBack' | 'license', file: File) => {
    if (!selectedRider) return;

    const validation = validateFile(file, {
      maxSizeMB: 5,
      recommendedSizeMB: 2,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      typeDescription: 'PDF, JPG, PNG, WEBP',
    });

    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsUpdating(true);
    try {
      const url = await uploadFile(file, { maxSizeMB: 5, recommendedSizeMB: 2 });
      const updatedDocs = {
        ...selectedRider.documents,
        [docType]: url,
      };

      const data = await apiFetch(`/admin/users/${selectedRider._id}/details`, {
        method: 'PATCH',
        body: JSON.stringify({ documents: updatedDocs }),
      });

      setSelectedRider({ ...selectedRider, documents: updatedDocs });
      setRiders(riders.map(r => r._id === selectedRider._id ? data.user : r));
      alert(`Document ${docType} updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!selectedRider) return;

    const validation = validateFile(file, {
      maxSizeMB: 2,
      recommendedSizeMB: 1,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      typeDescription: 'JPG, PNG, WEBP',
    });

    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsUpdating(true);
    try {
      const url = await uploadFile(file, { maxSizeMB: 2, recommendedSizeMB: 1 });
      const data = await apiFetch(`/admin/users/${selectedRider._id}/details`, {
        method: 'PATCH',
        body: JSON.stringify({ avatar: url }),
      });
      setSelectedRider({ ...selectedRider, avatar: url });
      setRiders(riders.map(r => r._id === selectedRider._id ? data.user : r));
      alert('Profile picture updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload profile picture');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMessageRider = () => {
    if (!selectedRider?.phone) return;
    
    let cleanPhone = selectedRider.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // Assume India if 10 digits
    }
    
    const msg = encodeURIComponent(`Hello ${selectedRider.name || 'Rider'}, regarding your ECD Driver account onboarding...`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="rider-details-container">
      <div className="header-row">
        <h1>Rider Verification & Details</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-wrapper glass-panel">
        {loading ? (
          <div className="loading-state">Loading riders...</div>
        ) : riders.length === 0 ? (
          <div className="empty-state">No riders found.</div>
        ) : (
          <>
            <table className="riders-table">
              <thead>
                <tr>
                  <th>Rider ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {riders.map(rider => (
                  <tr key={rider._id}>
                    <td>{rider.riderId || 'N/A'}</td>
                    <td>{rider.name || 'Unknown'}</td>
                    <td>{rider.phone}</td>
                    <td>
                      <span className={`badge ${statusMap[rider._id] === 'Suspended' || rider.status === 'suspended' ? 'status-suspended' : statusMap[rider._id] === 'Busy' ? 'status-busy' : rider.isOnline ? 'status-active' : 'unverified'}`}>
                        {rider.status === 'suspended' ? 'SUSPENDED' : statusMap[rider._id] ? statusMap[rider._id].toUpperCase() : rider.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${rider.isVerified ? 'verified' : 'unverified'}`}>
                        {rider.isVerified ? '✓ VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </td>
                    <td>{new Date(rider.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => openDetails(rider)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedRider && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel large-modal">
            <div className="modal-header">
              <h2>{selectedRider.name || 'Rider'} Details</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="info-section">
                <p><strong>Phone:</strong> {selectedRider.phone}</p>
                <p><strong>Rider ID:</strong> {selectedRider.riderId || 'Not Assigned'}</p>
                <p>
                  <strong>Account Status:</strong> 
                  <span className={`badge ${statusMap[selectedRider._id] === 'Suspended' || selectedRider.status === 'suspended' ? 'status-suspended' : statusMap[selectedRider._id] === 'Busy' ? 'status-busy' : selectedRider.isOnline ? 'status-active' : 'unverified'} ml-2`}>
                    {selectedRider.status === 'suspended' ? 'SUSPENDED' : statusMap[selectedRider._id] ? statusMap[selectedRider._id].toUpperCase() : selectedRider.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </p>
                <p>
                  <strong>Verification:</strong> 
                  <span className={`badge ${selectedRider.isVerified ? 'verified' : 'unverified'} ml-2`}>
                    {selectedRider.isVerified ? '✓ VERIFIED' : 'UNVERIFIED'}
                  </span>
                </p>
              </div>

              <div className="documents-section">
                <h3>Profile & Documents</h3>
                <div className="docs-grid">
                  
                  {/* Profile Picture */}
                  <div className="doc-card">
                    <h4>Profile Picture</h4>
                    {selectedRider.avatar ? (
                      <img 
                        src={selectedRider.avatar} 
                        alt="Profile Picture" 
                        onClick={() => setFullscreenImage(selectedRider.avatar || null)}
                      />
                    ) : (
                      <div className="no-doc">Not Uploaded</div>
                    )}
                    <label className="edit-doc-btn">
                      {isUpdating ? 'Uploading...' : 'Upload Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        hidden 
                        onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                        disabled={isUpdating}
                      />
                    </label>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Max: 2MB (Rec &lt;1MB)</span>
                  </div>

                  {/* Aadhar Front */}
                  <div className="doc-card">
                    <h4>Aadhar Front</h4>
                    {selectedRider.documents?.aadharFront ? (
                      <img 
                        src={selectedRider.documents.aadharFront} 
                        alt="Aadhar Front" 
                        onClick={() => setFullscreenImage(selectedRider.documents?.aadharFront || null)}
                      />
                    ) : (
                      <div className="no-doc">Not Uploaded</div>
                    )}
                    <label className="edit-doc-btn">
                      {isUpdating ? 'Uploading...' : 'Edit Image'}
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        hidden 
                        onChange={(e) => e.target.files?.[0] && handleDocumentUpload('aadharFront', e.target.files[0])}
                        disabled={isUpdating}
                      />
                    </label>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Max: 5MB (PDF/Image)</span>
                  </div>

                  {/* Aadhar Back */}
                  <div className="doc-card">
                    <h4>Aadhar Back</h4>
                    {selectedRider.documents?.aadharBack ? (
                      <img 
                        src={selectedRider.documents.aadharBack} 
                        alt="Aadhar Back" 
                        onClick={() => setFullscreenImage(selectedRider.documents?.aadharBack || null)}
                      />
                    ) : (
                      <div className="no-doc">Not Uploaded</div>
                    )}
                    <label className="edit-doc-btn">
                      {isUpdating ? 'Uploading...' : 'Edit Image'}
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        hidden 
                        onChange={(e) => e.target.files?.[0] && handleDocumentUpload('aadharBack', e.target.files[0])}
                        disabled={isUpdating}
                      />
                    </label>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Max: 5MB (PDF/Image)</span>
                  </div>

                  {/* License */}
                  <div className="doc-card">
                    <h4>Driving License</h4>
                    {selectedRider.documents?.license ? (
                      <img 
                        src={selectedRider.documents.license} 
                        alt="License" 
                        onClick={() => setFullscreenImage(selectedRider.documents?.license || null)}
                      />
                    ) : (
                      <div className="no-doc">Not Uploaded</div>
                    )}
                    <label className="edit-doc-btn">
                      {isUpdating ? 'Uploading...' : 'Edit Image'}
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        hidden 
                        onChange={(e) => e.target.files?.[0] && handleDocumentUpload('license', e.target.files[0])}
                        disabled={isUpdating}
                      />
                    </label>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Max: 5MB (PDF/Image)</span>
                  </div>
                </div>
              </div>

              <div className="action-panel">
                <h3>Admin Actions</h3>
                <div className="action-buttons">
                  {selectedRider.isVerified ? (
                    <button 
                      className="btn-verify" 
                      onClick={() => handleStatusChange(selectedRider.status || 'active', false)}
                      disabled={isUpdating}
                      style={{ background: '#f59e0b' }}
                    >
                      Mark as Unverified
                    </button>
                  ) : (
                    <button 
                      className="btn-verify" 
                      onClick={() => handleStatusChange(selectedRider.status || 'active', true)}
                      disabled={isUpdating}
                    >
                      Verify & Activate
                    </button>
                  )}
                  {selectedRider.status !== 'suspended' && (
                    <button 
                      className="btn-block" 
                      onClick={() => handleStatusChange('suspended', false)}
                      disabled={isUpdating}
                    >
                      Block / Suspend
                    </button>
                  )}
                  {selectedRider.status === 'suspended' && (
                    <button 
                      className="btn-verify" 
                      onClick={() => handleStatusChange('active', true)}
                      disabled={isUpdating}
                    >
                      Unblock & Reactivate
                    </button>
                  )}
                  
                  <button className="btn-message" onClick={handleMessageRider}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Message via WhatsApp
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && createPortal(
        <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
          <button className="close-fullscreen" onClick={() => setFullscreenImage(null)}>×</button>
          <img src={fullscreenImage} alt="Fullscreen Document" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}

    </div>
  );
};

export default RiderDetails;
