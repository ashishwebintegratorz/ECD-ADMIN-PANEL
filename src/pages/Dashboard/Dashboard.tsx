import { useState, useEffect } from 'react';
import { DollarSign, Bike, Activity, Store, Download } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardZonesMap from './DashboardZonesMap';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/admin/dashboard?filter=${filter}`);
        setStats(res);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, [filter]);

  const generateInvoice = async () => {
    if (!stats) return;
    
    const doc = new jsPDF();
    
    // Add Logo
    try {
      const img = new Image();
      img.src = '/logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if error
      });
      // The image is loaded
      doc.addImage(img, 'PNG', 14, 10, 25, 25);
    } catch (e) {
      console.log('Error loading logo');
    }

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 101, 52); 
    doc.text('ECD KART INVOICE', 45, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const invoiceId = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    doc.text(`Invoice ID: ${invoiceId}`, 45, 26);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 45, 31);
    
    let filterText = 'All Time';
    if (filter === 'today') filterText = 'Today';
    else if (filter === '7_days') filterText = 'Last 7 Days';
    else if (filter === '1_month') filterText = 'Last 1 Month';
    else if (filter === '1_year') filterText = 'Last 1 Year';
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Report Period: ${filterText}`, 45, 37);
    doc.setFont("helvetica", "normal");

    // Summary Boxes (Total Revenue, Rest Payout, Rider Payout, Net Profit)
    const boxY = 45;
    const boxW = 42;
    const boxH = 22;
    
    const boxes = [
      { title: 'Total Revenue', value: `Rs. ${stats?.revenue?.toFixed(2) || '0.00'}`, x: 14, color: [59, 130, 246] },
      { title: 'Restaurant Payout', value: `Rs. ${stats?.restaurantPayouts?.toFixed(2) || '0.00'}`, x: 60, color: [239, 68, 68] },
      { title: 'Rider Payout', value: `Rs. ${stats?.riderPayouts?.toFixed(2) || '0.00'}`, x: 106, color: [245, 158, 11] },
      { title: 'Net Profit', value: `Rs. ${stats?.netProfit?.toFixed(2) || '0.00'}`, x: 152, color: [16, 185, 129] }
    ];

    boxes.forEach(box => {
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(box.x, boxY, boxW, boxH, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(box.title, box.x + 4, boxY + 8);
      
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      // @ts-ignore
      doc.setTextColor(...box.color);
      doc.text(box.value, box.x + 4, boxY + 16);
      doc.setFont("helvetica", "normal");
    });

    // Recent orders table
    let finalY = boxY + boxH + 15;
    if (stats.recentOrders && stats.recentOrders.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text('Recent Delivered Orders', 14, finalY);
      doc.setFont("helvetica", "normal");
      
      const tableData = stats.recentOrders.map((order: any) => {
        const profit = (order.payableAmount || 0) - (order.restaurantEarnings || 0) - (order.driverEarnings || 0);
        return [
          new Date(order.deliveredAt || order.createdAt).toLocaleDateString(),
          order.orderNumber,
          order.store?.name || 'N/A',
          order.assignedDriver?.name || 'N/A',
          `Rs. ${order.payableAmount?.toFixed(2) || '0'}`,
          `Rs. ${order.restaurantEarnings?.toFixed(2) || '0'}`,
          `Rs. ${order.driverEarnings?.toFixed(2) || '0'}`,
          `Rs. ${profit.toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Order #', 'Restaurant', 'Rider', 'Revenue', 'Rest. Cut', 'Rider Cut', 'Net Profit']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 101, 52] }
      });
    }

    doc.save(`ECD_Invoice_${invoiceId}.pdf`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back, here's the business overview.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', color: filter === 'today' ? 'white' : '#9ca3af' }} onClick={() => setFilter('today')}>Today</button>
            <button className={`btn ${filter === '7_days' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', color: filter === '7_days' ? 'white' : '#9ca3af' }} onClick={() => setFilter('7_days')}>7 Days</button>
            <button className={`btn ${filter === '1_month' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', color: filter === '1_month' ? 'white' : '#9ca3af' }} onClick={() => setFilter('1_month')}>1 Month</button>
            <button className={`btn ${filter === '1_year' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', color: filter === '1_year' ? 'white' : '#9ca3af' }} onClick={() => setFilter('1_year')}>1 Year</button>
            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', color: filter === 'all' ? 'white' : '#9ca3af' }} onClick={() => setFilter('all')}>All Time</button>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={generateInvoice}
            disabled={!stats || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={18} />
            Download Invoice
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading dashboard stats...</div>
      ) : (
        <>
          {/* Live Delivery Zones & Operations Map Overview */}
          <DashboardZonesMap />

          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper success">
                <DollarSign size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-title">Total Revenue</p>
                <h3 className="stat-value">₹{stats?.revenue?.toFixed(2) || '0.00'}</h3>
                <span className="stat-change text-muted">Customer Payments</span>
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper warning">
                <Store size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-title">Restaurant Payouts</p>
                <h3 className="stat-value">₹{stats?.restaurantPayouts?.toFixed(2) || '0.00'}</h3>
                <span className="stat-change text-muted">To be paid / Paid</span>
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper info">
                <Bike size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-title">Rider Payouts</p>
                <h3 className="stat-value">₹{stats?.riderPayouts?.toFixed(2) || '0.00'}</h3>
                <span className="stat-change text-muted">To be paid / Paid</span>
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper accent">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-title">Net Profit</p>
                <h3 className="stat-value" style={{ color: '#10b981' }}>₹{stats?.netProfit?.toFixed(2) || '0.00'}</h3>
                <span className="stat-change text-muted">Platform Earnings</span>
              </div>
            </div>
          </div>

          <div className="dashboard-content" style={{ marginTop: '2rem' }}>
            <div className="pending-tasks glass-panel" style={{ width: '100%' }}>
              <div className="section-header">
                <h2>Recent Delivered Orders</h2>
              </div>
              
              <div className="task-list">
                {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No recent orders found.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '1rem' }}>Date</th>
                        <th style={{ padding: '1rem' }}>Order #</th>
                        <th style={{ padding: '1rem' }}>Restaurant</th>
                        <th style={{ padding: '1rem' }}>Rider</th>
                        <th style={{ padding: '1rem' }}>Selling Price (Revenue)</th>
                        <th style={{ padding: '1rem' }}>B2B Price (Rest. Cut)</th>
                        <th style={{ padding: '1rem' }}>Delivery Fee (Rider Cut)</th>
                        <th style={{ padding: '1rem' }}>Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order: any) => {
                        const profit = (order.payableAmount || 0) - (order.restaurantEarnings || 0) - (order.driverEarnings || 0);
                        return (
                          <tr key={order._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem' }}>{new Date(order.deliveredAt || order.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem', fontWeight: 600 }}>{order.orderNumber}</td>
                            <td style={{ padding: '1rem' }}>{order.store?.name || 'Unknown'}</td>
                            <td style={{ padding: '1rem' }}>{order.assignedDriver?.name || 'Unknown'}</td>
                            <td style={{ padding: '1rem', color: '#3b82f6' }}>₹{order.payableAmount?.toFixed(2)}</td>
                            <td style={{ padding: '1rem', color: '#ef4444' }}>₹{order.restaurantEarnings?.toFixed(2)}</td>
                            <td style={{ padding: '1rem', color: '#f59e0b' }}>₹{order.driverEarnings?.toFixed(2)}</td>
                            <td style={{ padding: '1rem', color: '#10b981', fontWeight: 'bold' }}>₹{profit.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
