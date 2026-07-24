import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Phone, User, CheckCircle2, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import './AdminLogin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return setError("Phone number is required");

    setLoading(true);
    setError('');
    try {
      await apiFetch('/auth/admin/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role: 'admin' })
      });
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !pin) return setError("OTP and PIN are required");
    if (pin.length !== 4) return setError("PIN must be exactly 4 digits");

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/auth/admin/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code: otp, role: 'admin', pin, name })
      });

      localStorage.setItem('token', res.token);
      localStorage.setItem('adminUser', JSON.stringify(res.user));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !pin) return setError("Phone and PIN are required");

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/auth/admin/login-with-pin', {
        method: 'POST',
        body: JSON.stringify({ phone, pin })
      });

      localStorage.setItem('token', res.token);
      localStorage.setItem('adminUser', JSON.stringify(res.user));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid phone or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-icon" style={{ background: 'transparent', marginBottom: '1.5rem' }}>
            <img 
              src="/logo.png" 
              alt="ECD Kart Logo" 
              style={{ 
                height: '100px', 
                maxHeight: '110px',
                objectFit: 'contain'
              }} 
            />
          </div>
          <h1>Admin Portal</h1>
          <p>{mode === 'login' ? 'Sign in to access your dashboard' : mode === 'signup' ? 'Set up your admin account' : 'Verify your phone number'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Secret PIN</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Secure Login'}
              <ChevronRight size={18} />
            </button>

            {/* <p className="toggle-text">
              First time here? <span onClick={() => { setMode('signup'); setError(''); }}>Set up account</span>
            </p> */}
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label>Admin Name (Optional)</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <p className="toggle-text">
              Already set up? <span onClick={() => { setMode('login'); setError(''); }}>Back to Login</span>
            </p>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label>Enter OTP</label>
              <div className="input-with-icon">
                <CheckCircle2 size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Create Secret PIN</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="4-digit PIN for future logins"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Complete Setup'}
            </button>

            <p className="toggle-text">
              Didn't receive code? <span onClick={handleSendOtp}>Resend OTP</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
