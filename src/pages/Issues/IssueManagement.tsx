import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';
import '../Users/UsersList.css'; // Use the same styles as UsersList for consistency

interface Issue {
  _id: string;
  description: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    phone: string;
    email: string;
  };
  order: {
    orderNumber: string;
    totalAmount: number;
  };
}

const IssueManagement: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/issues`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load issues');
      }
      
      if (data.success) {
        setIssues(data.issues);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/issues/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }
      
      if (data.success) {
        // Update local state
        setIssues(issues.map(issue => 
          issue._id === id ? { ...issue, status: newStatus } : issue
        ));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h1>Issue Management</h1>
        <p>View and manage customer issues for delivered orders.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-wrapper glass-panel">
        {loading ? (
          <div className="loading-state">Loading issues...</div>
        ) : issues.length === 0 ? (
          <div className="empty-state">No issues found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Order ID</th>
                <th>User Number</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue._id}>
                  <td className="date-cell">
                    {new Date(issue.createdAt).toLocaleDateString()}<br/>
                    <span style={{ fontSize: '0.8rem' }}>{new Date(issue.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.order?.orderNumber || 'N/A'}</span></td>
                  <td>{issue.user?.phone || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>₹{issue.order?.totalAmount || 0}</td>
                  <td style={{ maxWidth: '250px', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                    {issue.description}
                  </td>
                  <td>
                    <span className={`status-badge status-${issue.status === 'resolved' ? 'delivered' : 'pending'}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => updateStatus(issue._id, 'open')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #f59e0b',
                          background: issue.status === 'open' ? '#f59e0b' : 'transparent',
                          color: issue.status === 'open' ? 'white' : '#f59e0b',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => updateStatus(issue._id, 'resolved')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #10b981',
                          background: issue.status === 'resolved' ? '#10b981' : 'transparent',
                          color: issue.status === 'resolved' ? 'white' : '#10b981',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}
                      >
                        Solved
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default IssueManagement;
