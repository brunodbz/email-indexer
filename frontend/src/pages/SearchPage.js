import React, { useState, useEffect } from 'react';
import { documentService } from '../services/documentService';
import LoadingSpinner from '../components/LoadingSpinner';
import './SearchPage.css';

function SearchPage() {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Extrair domínio da URL se presente
    const urlParams = new URLSearchParams(window.location.search);
    const domainParam = urlParams.get('domain');
    if (domainParam) {
      setDomain(domainParam);
      handleSearch(domainParam);
    }
  }, []);

  const handleSearch = async (searchDomain = domain, page = 1) => {
    if (!searchDomain) {
      setError('Por favor, insira um domínio para buscar');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await documentService.searchByDomain(searchDomain, page);
      setResults(response.data);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao buscar emails');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!domain) {
      setError('Por favor, insira um domínio para exportar');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const response = await documentService.exportResults(domain, format);
      
      // Criar blob e download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `emails_${domain}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao exportar resultados');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(domain, 1);
  };

  const handlePageChange = (page) => {
    handleSearch(domain, page);
  };

  return (
    <div className="search-page">
      <h1>Buscar Emails por Domínio</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Digite o domínio (ex: @email.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? <LoadingSpinner inline /> : 'Buscar'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {results && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Resultados: {results.total} emails encontrados</h5>
            <div>
              <button 
                className="btn btn-success me-2" 
                onClick={() => handleExport('csv')}
                disabled={exporting || results.total === 0}
              >
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => handleExport('xlsx')}
                disabled={exporting || results.total === 0}
              >
                {exporting ? 'Exportando...' : 'Exportar XLSX'}
              </button>
            </div>
          </div>
          
          {results.total === 0 ? (
            <div className="alert alert-info">Nenhum email encontrado para o domínio "{domain}"</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Conteúdo</th>
                      <th>Email</th>
                      <th>Domínio</th>
                      <th>Data de Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.map(result => (
                      <tr key={result.id}>
                        <td className="text-break">{result.content}</td>
                        <td>{result.email}</td>
                        <td>{result.domain}</td>
                        <td>{new Date(result.upload_date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {results.totalPages > 1 && (
                <nav aria-label="Page navigation">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </button>
                    </li>
                    {Array.from({ length: results.totalPages }, (_, i) => i + 1).map(page => (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === results.totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === results.totalPages}
                      >
                        Próximo
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;