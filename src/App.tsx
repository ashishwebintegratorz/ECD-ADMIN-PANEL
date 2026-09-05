import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import RestaurantOverview from './pages/Restaurants/RestaurantOverview';
import RestaurantOnboard from './pages/Restaurants/RestaurantOnboard';
import MenuManagement from './pages/Restaurants/MenuManagement';
import RestaurantPayouts from './pages/Restaurants/RestaurantPayouts';
import SpecialDishes from './pages/Restaurants/SpecialDishes';
import MenuApprovals from './pages/Restaurants/MenuApprovals';
import AdminLogin from './pages/Auth/AdminLogin';
import RiderPayouts from './pages/Riders/RiderPayouts';
import RiderCodSettlements from './pages/Riders/RiderCodSettlements';
import RiderStatus from './pages/Riders/RiderStatus';
import RiderDetails from './pages/Riders/RiderDetails';
import RiderOrders from './pages/Riders/RiderOrders';
import RiderSystemManage from './pages/Riders/RiderSystemManage';
import BlockedAccounts from './pages/Admin/BlockedAccounts';
import Settings from './pages/Settings/Settings';
import UsersList from './pages/Users/UsersList';
import BannerManagement from './pages/Banners/BannerManagement';
import PushNotificationPage from './pages/Admin/PushNotificationPage';
import CouponManagement from './pages/Admin/CouponManagement';
import RefundManagement from './pages/Refunds/RefundManagement';
import IssueManagement from './pages/Issues/IssueManagement';
import DeliveryZones from './pages/Zones/DeliveryZones';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

import { useState } from 'react';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-container">
              <Sidebar isCollapsed={isSidebarCollapsed} />
              <div className="main-content">
                <Topbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isSidebarCollapsed={isSidebarCollapsed} />
                <div className="page-content animate-fade-in">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/restaurants" element={<RestaurantOverview />} />
                    <Route path="/restaurants/onboard" element={<RestaurantOnboard />} />
                    <Route path="/restaurants/menu" element={<MenuManagement />} />
                    <Route path="/restaurants/:id/menu" element={<MenuManagement />} />
                    <Route path="/restaurants/payouts" element={<RestaurantPayouts />} />
                    <Route path="/restaurants/special-dishes" element={<SpecialDishes />} />
                    <Route path="/restaurants/approvals" element={<MenuApprovals />} />
                    <Route path="/riders/details" element={<RiderDetails />} />
                    <Route path="/riders/status" element={<RiderStatus />} />
                    <Route path="/riders/payouts" element={<RiderPayouts />} />
                    <Route path="/riders/cod-settlements" element={<RiderCodSettlements />} />
                    <Route path="/riders/orders" element={<RiderOrders />} />
                    <Route path="/riders/system-manage" element={<RiderSystemManage />} />
                    <Route path="/system/blocked-accounts" element={<BlockedAccounts />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/users" element={<UsersList />} />
                    <Route path="/banners" element={<BannerManagement />} />
                    <Route path="/push-notifications" element={<PushNotificationPage />} />
                    <Route path="/coupons" element={<CouponManagement />} />
                    <Route path="/refunds" element={<RefundManagement />} />
                    <Route path="/issues" element={<IssueManagement />} />
                    <Route path="/zones" element={<DeliveryZones />} />
                  </Routes>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
