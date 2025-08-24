import React, { useState } from 'react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProfilePage.css';

function ProfilePage() {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      return setError('As senhas não coincidem');
    }
    
    if (newPassword.length < 6) {
      return setError('A nova senha deve ter pelo menos 6 caracteres');
    }
    
    setLoading(true);
    
    try {
      await authService.updatePassword(currentPassword, newPassword);
      setSuccess('Senha atualizada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupMfa = async () => {
    setMfaLoading(true);
    setError('');
    
    try {
      const response = await authService.setupMfa();
      setMfaSecret(response.data.secret);
      setMfaQrCode(response.data.qrCode);
      setShowMfaSetup(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao configurar MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    if (!mfaToken) {
      return setError('Digite o código do app autenticador');
    }
    
    setMfaLoading(true);
    setError('');
    
    try {
      await authService.enableMfa(mfaToken);
      setSuccess('MFA ativado com sucesso');
      setShowMfaSetup(false);
      setMfaToken('');
      // Atualizar o usuário no contexto
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao ativar MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!currentPassword) {
      return setError('Digite sua senha para desativar MFA');
    }
    
    setMfaLoading(true);
    setError('');
    
    try {
      await authService.disableMfa(currentPassword);
      setSuccess('MFA desativado com sucesso');
      setCurrentPassword('');
      // Atualizar o usuário no contexto
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao desativar MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <h1>Perfil do Usuário</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Informações do Usuário</h5>
            </div>
            <div className="card-body">
              <p><strong>Nome de Usuário:</strong> {currentUser.username}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Função:</strong> {currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              <p><strong>MFA:</strong> {currentUser.mfaEnabled ? 'Ativado' : 'Desativado'}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Autenticação de Dois Fatores (MFA)</h5>
            </div>
            <div className="card-body">
              {currentUser.mfaEnabled ? (
                <div>
                  <p>O MFA está ativado para sua conta.</p>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDisableMfa}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? <LoadingSpinner inline /> : 'Desativar MFA'}
                  </button>
                  <div className="mt-3">
                    <label htmlFor="currentPasswordMfa" className="form-label">Senha</label>
                    <input
                      type="password"
                      className="form-control"
                      id="currentPasswordMfa"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha para desativar MFA"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p>O MFA não está ativado para sua conta.</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSetupMfa}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? <LoadingSpinner inline /> : 'Configurar MFA'}
                  </button>
                </div>
              )}
              
              {showMfaSetup && (
                <div className="mt-4">
                  <h6>Passo 1: Escaneie o QR Code</h6>
                  <div className="text-center my-3">
                    <img src={mfaQrCode} alt="QR Code para MFA" className="img-fluid" style={{ maxWidth: '200px' }} />
                  </div>
                  <p className="text-muted">Ou use este código manualmente: <code>{mfaSecret}</code></p>
                  
                  <h6>Passo 2: Verifique o código</h6>
                  <div className="mb-3">
                    <label htmlFor="mfaToken" className="form-label">Código do App</label>
                    <input
                      type="text"
                      className="form-control"
                      id="mfaToken"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value)}
                      placeholder="Digite o código de 6 dígitos"
                    />
                  </div>
                  <button 
                    className="btn btn-success" 
                    onClick={handleEnableMfa}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? <LoadingSpinner inline /> : 'Ativar MFA'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Alterar Senha</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label htmlFor="currentPassword" className="form-label">Senha Atual</label>
                  <input
                    type="password"
                    className="form-control"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">Nova Senha</label>
                  <input
                    type="password"
                    className="form-control"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <LoadingSpinner inline /> : 'Atualizar Senha'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;