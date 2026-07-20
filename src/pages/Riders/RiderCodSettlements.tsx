import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import './RiderCodSettlements.css';

interface CodSummary {
    _id: string;
    name: string;
    phone: string;
    riderId: string;
    codBalance: number;
    codEarnings: number;
    walletBalance: number;
    amountToPayAdmin: number;
    totalOrders: number;
    restaurantPay: number;
    restaurantNames: string;
}

interface CodHistory {
    _id: string;
    amount: number;
    type: string;
    settledAt: string;
}

const RiderCodSettlements: React.FC = () => {
    const [riders, setRiders] = useState<CodSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<CodHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedRiderName, setSelectedRiderName] = useState("");

    useEffect(() => {
        fetchCodSummary();
    }, []);

    const fetchCodSummary = async () => {
        try {
            const data = await apiFetch('/admin/riders/cod-summary');
            setRiders(data.riders || []);
        } catch (error) {
            console.error('Error fetching COD summary:', error);
            alert('Failed to load COD settlements');
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async (riderId: string) => {
        if (!window.confirm("Are you sure you want to mark this rider's COD as fully settled? This will reset their COD balance to 0.")) return;
        
        try {
            await apiFetch('/admin/riders/cod/settle', {
                method: 'POST',
                body: JSON.stringify({ riderId }),
            });
            alert("COD settled successfully!");
            fetchCodSummary();
        } catch (error) {
            console.error("Error settling COD:", error);
            alert("Failed to settle COD");
        }
    };

    const handleManualDeduct = async (riderId: string) => {
        const amountStr = window.prompt("Enter the exact amount to deduct from this rider's COD balance:");
        if (!amountStr) return;

        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid positive number.");
            return;
        }

        try {
            await apiFetch('/admin/riders/cod/deduct', {
                method: 'POST',
                body: JSON.stringify({ riderId, amount }),
            });
            alert(`Successfully deducted ₹${amount} from COD balance.`);
            fetchCodSummary();
        } catch (error) {
            console.error("Error deducting COD:", error);
            alert("Failed to deduct COD manually");
        }
    };

    const handleViewHistory = async (riderId: string, name: string) => {
        setHistoryModalOpen(true);
        setSelectedRiderName(name);
        setHistoryLoading(true);
        try {
            const data = await apiFetch(`/admin/riders/${riderId}/cod-history`);
            setSelectedHistory(data.history || []);
        } catch (error) {
            console.error("Error fetching COD history:", error);
            alert("Failed to fetch COD history");
        } finally {
            setHistoryLoading(false);
        }
    };

    if (loading) {
        return <div className="cod-container">Loading...</div>;
    }

    return (
        <div className="cod-container">
            <div className="cod-header">
                <h1>Rider COD Settlements</h1>
                <p>Track cash collected by riders and the net amount they owe to the platform.</p>
            </div>

            <div className="cod-table-card">
                {riders.length === 0 ? (
                    <div className="empty-state">
                        <h3>No Pending COD Settlements</h3>
                        <p>All riders have cleared their COD balances.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="cod-table">
                            <thead>
                                <tr>
                                    <th>Rider ID</th>
                                    <th>Rider Name</th>
                                    <th>Total Orders</th>
                                    <th>Total COD Collected</th>
                                    <th>Rider Earning - Amount</th>
                                    <th>Admin To Take For Platform Fee</th>
                                    <th>Restaurant Name</th>
                                    <th>Restaurant To Pay</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riders.map((rider) => (
                                    <tr key={rider._id}>
                                        <td>{rider.riderId}</td>
                                        <td>
                                            <div className="rider-info">
                                                <span className="rider-name">{rider.name}</span>
                                                <span className="rider-phone">{rider.phone}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="amount">{rider.totalOrders || 0}</span>
                                        </td>
                                        <td>
                                            <span className="amount collected">₹{(rider.codBalance || 0).toFixed(0)}</span>
                                        </td>
                                        <td>
                                            <span className="amount offset">- ₹{(rider.codEarnings || 0).toFixed(0)}</span>
                                        </td>
                                        <td>
                                            <span className="amount due">₹{(rider.amountToPayAdmin || 0).toFixed(0)}</span>
                                        </td>
                                        <td>
                                            <span className="restaurant-name">{rider.restaurantNames}</span>
                                        </td>
                                        <td>
                                            <span className="amount due" style={{ color: '#d32f2f' }}>₹{(rider.restaurantPay || 0).toFixed(0)}</span>
                                        </td>
                                        <td>
                                            {rider.amountToPayAdmin > 0 ? (
                                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>&#10008; Pending</span>
                                            ) : (
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>&#10004; Settled</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-settle" onClick={() => handleSettle(rider._id)}>Collect Full</button>
                                                <button className="btn-deduct" onClick={() => handleManualDeduct(rider._id)}>Manual Deduct</button>
                                                <button className="btn-history" onClick={() => handleViewHistory(rider._id, rider.name)}>History</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {historyModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>COD History - {selectedRiderName}</h2>
                        <button className="close-btn" onClick={() => setHistoryModalOpen(false)}>×</button>
                        
                        {historyLoading ? (
                            <p>Loading history...</p>
                        ) : selectedHistory.length === 0 ? (
                            <p>No past COD settlements found for this rider.</p>
                        ) : (
                            <table className="cod-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedHistory.map((h) => (
                                        <tr key={h._id}>
                                            <td>{new Date(h.settledAt).toLocaleString()}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{h.type}</td>
                                            <td className="amount collected">₹{h.amount.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiderCodSettlements;
