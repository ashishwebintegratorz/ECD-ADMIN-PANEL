import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShoppingBag,
  AlertTriangle,
  Star,
  Wallet,
  UtensilsCrossed,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { playNotificationSound } from '../../utils/sound';
import './NotificationDropdown.css';

export interface AdminNotificationItem {
  _id: string;
  title: string;
  body: string;
  type?: 'order' | 'issue' | 'review' | 'menu_approval' | 'withdrawal' | 'general' | string;
  data?: Record<string, any>;
  read?: boolean;
  createdAt: string;
}

const timeAgo = (dateStr: string) => {
  try {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'order' | 'issue' | 'review' | 'menu_approval' | 'withdrawal'>('all');
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem('admin_notification_sound_muted') === 'true'
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications/admin?limit=40');
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load admin notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Socket real-time listener
    const socket = getSocket();

    const handleNewNotification = (notification: AdminNotificationItem) => {
      setNotifications((prev) => [notification, ...prev.filter((n) => n._id !== notification._id)]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
    };

    socket.on('adminNotification', handleNewNotification);
    socket.on('adminNotificationReceived', handleNewNotification);

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('adminNotification', handleNewNotification);
      socket.off('adminNotificationReceived', handleNewNotification);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    localStorage.setItem('admin_notification_sound_muted', String(nextState));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/admin/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await apiFetch('/notifications/admin/clear-all', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiFetch(`/notifications/admin/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Toggle Accordion open/close and mark as read
  const handleToggleAccordion = async (notification: AdminNotificationItem) => {
    const isCurrentlyExpanded = expandedId === notification._id;
    setExpandedId(isCurrentlyExpanded ? null : notification._id);

    if (!notification.read) {
      try {
        await apiFetch(`/notifications/admin/${notification._id}/read`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  const handleNavigateToTarget = (notification: AdminNotificationItem) => {
    setIsOpen(false);
    const linkUrl = notification.data?.linkUrl;
    if (linkUrl) {
      // Map old/mistyped urls if any
      if (linkUrl === '/restaurants/menu-approvals') {
        navigate('/restaurants/approvals');
        return;
      }
      if (linkUrl === '/riders/withdrawals') {
        navigate('/riders/payouts');
        return;
      }
      navigate(linkUrl);
      return;
    }

    const type = detectCategory(notification);
    switch (type) {
      case 'order':
        navigate('/riders/orders');
        break;
      case 'issue':
        navigate('/issues');
        break;
      case 'review':
        navigate('/restaurants');
        break;
      case 'withdrawal':
        navigate('/riders/payouts');
        break;
      case 'menu_approval':
        navigate('/restaurants/approvals');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  // Helper to categorize items accurately
  const detectCategory = (n: AdminNotificationItem) => {
    if (n.type) {
      if (n.type === 'menu_approval' || n.type === 'approval') return 'menu_approval';
      if (['order', 'issue', 'review', 'withdrawal'].includes(n.type)) return n.type;
    }
    const t = (n.title || '').toLowerCase();
    if (t.includes('menu') || t.includes('approval') || t.includes('dish')) return 'menu_approval';
    if (t.includes('order')) return 'order';
    if (t.includes('issue') || t.includes('ticket') || t.includes('support')) return 'issue';
    if (t.includes('review') || t.includes('rating') || t.includes('star')) return 'review';
    if (t.includes('withdrawal') || t.includes('payout') || t.includes('wallet')) return 'withdrawal';
    return 'general';
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    const cat = detectCategory(n);
    return cat === activeTab;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order':
        return <ShoppingBag size={19} />;
      case 'issue':
        return <AlertTriangle size={19} />;
      case 'review':
        return <Star size={19} />;
      case 'withdrawal':
        return <Wallet size={19} />;
      case 'menu_approval':
        return <UtensilsCrossed size={19} />;
      default:
        return <Sparkles size={19} />;
    }
  };

  const getActionButtonLabel = (category: string) => {
    switch (category) {
      case 'order':
        return 'View Live Order';
      case 'issue':
        return 'View Ticket';
      case 'review':
        return 'View Review';
      case 'withdrawal':
        return 'Process Payout';
      case 'menu_approval':
        return 'Review & Set Price';
      default:
        return 'View Details';
    }
  };

  return (
    <div className="notification-container" ref={containerRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={21} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-header">
            <div className="notification-title-group">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notification-count-tag">{unreadCount} new</span>
              )}
            </div>
            <div className="notification-header-actions">
              <button
                className="icon-action-btn"
                onClick={toggleSound}
                title={isMuted ? 'Unmute Notification Sound' : 'Mute Notification Sound'}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              {unreadCount > 0 && (
                <button
                  className="icon-action-btn success"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="icon-action-btn danger"
                  onClick={handleClearAll}
                  title="Clear all"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notification-tabs">
            <button
              className={`notification-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`notification-tab-btn ${activeTab === 'order' ? 'active' : ''}`}
              onClick={() => setActiveTab('order')}
            >
              Orders
            </button>
            <button
              className={`notification-tab-btn ${activeTab === 'menu_approval' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu_approval')}
            >
              Approvals
            </button>
            <button
              className={`notification-tab-btn ${activeTab === 'issue' ? 'active' : ''}`}
              onClick={() => setActiveTab('issue')}
            >
              Issues
            </button>
            <button
              className={`notification-tab-btn ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Reviews
            </button>
            <button
              className={`notification-tab-btn ${activeTab === 'withdrawal' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdrawal')}
            >
              Payouts
            </button>
          </div>

          {/* Accordion Notification List */}
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={36} opacity={0.3} color="#16a34a" />
                <p>No notifications in this category</p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const category = detectCategory(n);
                const isExpanded = expandedId === n._id;

                return (
                  <div
                    key={n._id}
                    className={`notification-item-accordion ${!n.read ? 'unread' : ''}`}
                  >
                    {/* Collapsed Header */}
                    <div
                      className="notification-item-header"
                      onClick={() => handleToggleAccordion(n)}
                    >
                      <div className={`notification-icon-wrapper ${category}`}>
                        {getCategoryIcon(category)}
                      </div>

                      <div className="notification-header-text">
                        <div className="notification-title-row">
                          <span className="notification-item-title">{n.title}</span>
                          <span className="notification-time">{timeAgo(n.createdAt)}</span>
                        </div>

                        {!isExpanded && (
                          <div className="notification-preview-row">
                            <p className="notification-preview-text">{n.body}</p>
                            {!n.read && <span className="notification-unread-dot" />}
                          </div>
                        )}
                      </div>

                      <ChevronDown
                        size={18}
                        className={`notification-chevron ${isExpanded ? 'expanded' : ''}`}
                      />
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="notification-item-body-expanded">
                        <div className="notification-full-body">{n.body}</div>

                        <div className="notification-expanded-actions">
                          <button
                            className="notification-action-btn"
                            onClick={() => handleNavigateToTarget(n)}
                          >
                            <span>{getActionButtonLabel(category)}</span>
                            <ArrowRight size={14} />
                          </button>

                          <button
                            className="notification-delete-btn"
                            onClick={(e) => handleDeleteOne(e, n._id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
