import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Store, PlusCircle, Menu, ShieldAlert, Settings, Users, Star, Sliders, Image as ImageIcon, BellRing, Activity, CheckCircle, RefreshCcw } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed?: boolean;
}

const Sidebar = ({ isCollapsed = false }: SidebarProps) => {
  return (
    <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="logo-text">
          {isCollapsed ? (
            <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              E<span className="highlight">A</span>
            </span>
          ) : (
            <>ECD <span className="highlight">Admin</span></>
          )}
        </h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Dashboard">
          <LayoutDashboard size={20} />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        
        <NavLink to="/riders/cod-settlements" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="COD Settlements" style={{ color: "#f97316" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
          {!isCollapsed && <span>COD Settlements</span>}
        </NavLink>

        <NavLink to="/system/blocked-accounts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Blocked Accounts" style={{ color: "#ef4444" }}>
          <ShieldAlert size={20} />
          {!isCollapsed && <span>Blocked Accounts</span>}
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="User Management System">
          <Users size={20} />
          {!isCollapsed && <span>User Management</span>}
        </NavLink>

        <NavLink to="/banners" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Banner Management">
          <ImageIcon size={20} />
          {!isCollapsed && <span>Banners</span>}
        </NavLink>

        <NavLink to="/push-notifications" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Push Notifications" style={{ color: "#8b5cf6" }}>
          <BellRing size={20} />
          {!isCollapsed && <span>Push Notifications</span>}
        </NavLink>

        <NavLink to="/coupons" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Coupon Management" style={{ color: "#10b981" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H2v-6z"/><path d="M22 15h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6z"/><rect x="2" y="3" width="20" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          {!isCollapsed && <span>Coupon Management</span>}
        </NavLink>

        <NavLink to="/refunds" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Refund Management" style={{ color: "#3b82f6" }}>
          <RefreshCcw size={20} />
          {!isCollapsed && <span>Refunds</span>}
        </NavLink>

        <div className="nav-group">
          {!isCollapsed && <p className="nav-label">Restaurants</p>}
          <NavLink to="/restaurants" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Overview">
            <Store size={20} />
            {!isCollapsed && <span>Overview</span>}
          </NavLink>
          <NavLink to="/restaurants/menu" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Menu">
            <Menu size={20} />
            {!isCollapsed && <span>Menu</span>}
          </NavLink>
          <NavLink to="/restaurants/onboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Onboard">
            <PlusCircle size={20} />
            {!isCollapsed && <span>Onboard</span>}
          </NavLink>
          <NavLink to="/restaurants/payouts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Payouts">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            {!isCollapsed && <span>Payouts</span>}
          </NavLink>
          <NavLink to="/restaurants/special-dishes" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Special Dishes">
            <Star size={20} />
            {!isCollapsed && <span>Special Dishes</span>}
          </NavLink>
          <NavLink to="/restaurants/approvals" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Menu Approvals" style={{ color: "#f59e0b" }}>
            <CheckCircle size={20} />
            {!isCollapsed && <span>Menu Approvals</span>}
          </NavLink>
        </div>
        <div className="nav-group">
          {!isCollapsed && <p className="nav-label">Riders</p>}
          <NavLink to="/riders/details" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Rider Details">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            {!isCollapsed && <span>Rider Details</span>}
          </NavLink>
          <NavLink to="/riders/status" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Rider Status">
            <Activity size={20} />
            {!isCollapsed && <span>Rider Status</span>}
          </NavLink>
          <NavLink to="/riders/orders" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Rider Orders">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            {!isCollapsed && <span>Rider Orders</span>}
          </NavLink>
          <NavLink to="/riders/payouts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Rider Payouts">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            {!isCollapsed && <span>Payouts</span>}
          </NavLink>
          <NavLink to="/riders/system-manage" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Rider System Manage">
            <Sliders size={20} />
            {!isCollapsed && <span>System Manage</span>}
          </NavLink>
        </div>
        
        <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{ marginTop: 'auto' }} title="Settings">
          <Settings size={20} />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
