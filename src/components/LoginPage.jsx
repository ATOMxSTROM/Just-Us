import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = login(username, password);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-logo">
          <span className="logo-word">Us</span>
          <span className="logo-heart">♡</span>
        </div>
        <p className="login-tagline">just the two of us</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="who are you?"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading || !username || !password}>
            {loading ? '...' : 'come in'}
          </button>
        </form>
      </div>
    </div>
  );
}
