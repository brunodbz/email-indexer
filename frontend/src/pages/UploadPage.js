import React, { useState } from 'react';
import { documentService } from '../services/documentService';
import LoadingSpinner from '../components/LoadingSpinner';
import './UploadPage.css';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Por favor, selecione um arquivo de texto (.txt)');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await documentService.uploadDocument(file);
      setSuccess(true);
      setFile(null);
      document.getElementById('fileInput').value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <h1>Upload de Arquivo</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">Arquivo enviado com sucesso!</div>}
      
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="fileInput" className="form-label">Selecione um arquivo de texto (.txt)</label>
              <input
                type="file"
                className="form-control"
                id="fileInput"
                accept=".txt,text/plain"
                onChange={handleFileChange}
                required
              />
              <div className="form-text">Apenas arquivos de texto são permitidos.</div>
            </div>
            
            {file && (
              <div className="mb-3">
                <div className="alert alert-info">
                  <strong>Arquivo selecionado:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              </div>
            )}
            
            <div className="d-grid">
              <button type="submit" className="btn btn-primary" disabled={loading || !file}>
                {loading ? <LoadingSpinner inline /> : 'Enviar Arquivo'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="mt-4">
        <h5>Formato do Arquivo</h5>
        <p>O arquivo deve conter uma lista de URLs com emails, uma por linha. Exemplo:</p>
        <pre className="bg-light p-3 rounded">
          {`https://accounts.site.com/f50f9e27-2b88-4588-9fd6-0c8a9e5db0cd/login:user.ario@email.com:Kts489770@
https://accounts.site.com/f50f9e27-2b88-4588-9fd6-0c8a9e5db0cd/login:john.doe@example.com:Abc123456@
https://accounts.site.com/f50f9e27-2b88-4588-9fd6-0c8a9e5db0cd/login:jane.smith@domain.com:Xyz789012@`}
        </pre>
      </div>
    </div>
  );
}

export default UploadPage;