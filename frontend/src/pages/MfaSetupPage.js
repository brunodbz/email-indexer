import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner';
import './MfaSetupPage.css';

function MfaSetupPage() {
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const setupMfa = async () => {
      try {
        const response = await authService.setupMfa();
        setMfaSecret(response.data.secret);
        setMfaQrCode(response.data.qrCode);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao configurar MFA');
      }
    };

    setupMfa();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mfaToken) {
      return setError('Digite o código do app autenticador');
    }
    
    setLoading(true);
    setError('');
    
    try {
      await authService.enableMfa(mfaToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao ativar MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mfa-setup-page">
      <div className="mfa-setup-card">
        <h2 className="text-center mb-4">Configurar Autenticação de Dois Fatores</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        {mfaSecret ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <h5>Passo 1: Escaneie o QR Code</h5>
              <div className="text-center my-3">
                <img src={mfaQrCode} alt="QR Code para MFA" className="img-fluid" style={{ maxWidth: '200px' }} />
              </div>
              <p className="text-muted">Ou use este código manualmente:</p>
              <div className="bg-light p-2 rounded text-center">
                <code>{mfaSecret}</code>
              </div>
            </div>
            
            <div className="mb-4">
              <h5>Passo 2: Verifique o código</h5>
              <div className="mb-3">
                <label htmlFor="mfaToken" className="form-label">Código do App</label>
                <input
                  type="text"
                  className="form-control"
                  id="mfaToken"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  placeholder="Digite o código de 6 dígitos"
                  required
                />
              </div>
            </div>
            
            <div className="d-grid">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <LoadingSpinner inline /> : 'Ativar MFA'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <LoadingSpinner />
            <p className="mt-2">Carregando configuração MFA...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MfaSetupPage;