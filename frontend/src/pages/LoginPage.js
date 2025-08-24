import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!showMfa) {
        const response = await login(email, password);
        
        if (response.data.user.mfaEnabled) {
          setShowMfa(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        await authService.verifyMfa(mfaToken);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="text-center mb-4">Email Indexer</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          {!showMfa ? (
            <>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="mb-3">
              <label htmlFor="mfaToken" className="form-label">Código MFA</label>
              <input
                type="text"
                className="form-control"
                id="mfaToken"
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="Digite o código do seu app autenticador"
                required
              />
              <div className="form-text">Digite o código de 6 dígitos do seu aplicativo autenticador.</div>
            </div>
          )}
          <div className="d-grid">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Carregando...' : showMfa ? 'Verificar' : 'Entrar'}
            </button>
          </div>
        </form>
        <div className="text-center mt-3">
          <p>Não tem uma conta? <Link to="/register">Registre-se</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;