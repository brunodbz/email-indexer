import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ inline = false }) {
  if (inline) {
    return (
      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    );
  }
  
  return (
    <div className="text-center py-5">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>
  );
}

export default LoadingSpinner;