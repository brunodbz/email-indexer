import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminDashboardPage.css';

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allowNewUsers, setAllowNewUsers] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await adminService.getDashboard();
        setDashboard(response.data);
        setAllowNewUsers(response.data.settings.allowNewUsers);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar painel administrativo');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleToggleNewUsers = async () => {
    try {
      await adminService.updateSettings({ allowNewUsers: !allowNewUsers });
      setAllowNewUsers(!allowNewUsers);
      if (dashboard) {
        setDashboard({
          ...dashboard,
          settings: {
            ...dashboard.settings,
            allowNewUsers: !allowNewUsers
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar configurações');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="admin-dashboard-page">
      <h1>Painel Administrativo</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {dashboard && (
        <>
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-white bg-primary">
                <div className="card-body">
                  <h5 className="card-title">Total de Usuários</h5>
                  <p className="card-text display-4">{dashboard.stats.totalUsers}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-success">
                <div className="card-body">
                  <h5 className="card-title">Total de Documentos</h5>
                  <p className="card-text display-4">{dashboard.stats.totalDocuments}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-info">
                <div className="card-body">
                  <h5 className="card-title">Total de Buscas</h5>
                  <p className="card-text display-4">{dashboard.stats.totalSearches}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-white bg-warning">
                <div className="card-body">
                  <h5 className="card-title">Total de Exportações</h5>
                  <p className="card-text display-4">{dashboard.stats.totalExports}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Configurações do Sistema</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="allowNewUsers"
                  checked={allowNewUsers}
                  onChange={handleToggleNewUsers}
                />
                <label className="form-check-label" htmlFor="allowNewUsers">
                  Permitir criação de novos usuários
                </label>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Atividades Recentes</h5>
            </div>
            <div className="card-body">
              {dashboard.recentActivities.length === 0 ? (
                <p className="text-muted">Nenhuma atividade recente</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Ação</th>
                        <th>Entidade</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td>{activity.username}</td>
                          <td>{activity.action}</td>
                          <td>{activity.entity_type}</td>
                          <td>{new Date(activity.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;