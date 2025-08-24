import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentService } from '../services/documentService';
import LoadingSpinner from '../components/LoadingSpinner';
import './DashboardPage.css';

function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await documentService.getDocuments();
        setDocuments(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar documentos');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <Link to="/upload" className="btn btn-primary">Upload de Arquivo</Link>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {documents.length === 0 ? (
            <div className="text-center py-5">
              <h3>Nenhum documento encontrado</h3>
              <p className="text-muted">Faça upload de um arquivo de texto para começar.</p>
              <Link to="/upload" className="btn btn-primary mt-3">Upload de Arquivo</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Nome do Arquivo</th>
                    <th>Tamanho</th>
                    <th>Data de Upload</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td>{doc.original_name}</td>
                      <td>{(doc.file_size / 1024).toFixed(2)} KB</td>
                      <td>{new Date(doc.upload_date).toLocaleString()}</td>
                      <td>
                        <Link to={`/search?domain=`} className="btn btn-sm btn-outline-primary">
                          Buscar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;