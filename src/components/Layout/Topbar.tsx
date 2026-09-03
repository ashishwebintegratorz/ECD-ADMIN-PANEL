import { useState, useEffect } from 'react';
import { UserCircle, LogOut, Menu } from 'lucide-react';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import './Topbar.css';

interface TopbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const Topbar = ({ onToggleSidebar }: TopbarProps) => {
  const [adminName, setAdminName] = useState('Admin');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('adminUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setAdminName(user.name);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
  };

  return (
    <header className="topbar glass-panel" style={{ position: 'relative', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="topbar-logo" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button onClick={onToggleSidebar} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Sidebar">
          <Menu size={24} />
        </button>
        <img 
          src="/logo.png" 
          alt="ECD Kart Logo" 
          style={{ 
            height: '60px', 
            maxHeight: '64px',
            objectFit: 'contain'
          }} 
        />
        <span style={{ fontWeight: 800, letterSpacing: '1px' }}>ECD KART</span>
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <NotificationDropdown />

        <div style={{ position: 'relative' }}>
          <div className="profile-btn" onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserCircle size={32} className="avatar-icon" />
            <div className="profile-info">
              <span className="profile-name">Admin {adminName}</span>
              <span className="profile-role">Super Admin</span>
            </div>
          </div>
          
          {showDropdown && (
            <div className="glass-panel" style={{ position: 'absolute', top: '120%', right: 0, padding: '0.5rem', display: 'flex', flexDirection: 'column', minWidth: '150px', zIndex: 9999, pointerEvents: 'auto' }}>
              <button 
                onClick={handleLogout} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--error)', border: 'none', cursor: 'pointer', padding: '0.75rem', width: '100%', textAlign: 'left', borderRadius: '4px', pointerEvents: 'all' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
