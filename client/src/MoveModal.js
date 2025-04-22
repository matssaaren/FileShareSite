import React from 'react';

function MoveModal({ folders, onSelect, onClose, isInRoot }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%',
      height: '100%', background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999
    }}>
      <div style={{
        background: '#fff', padding: '1.5rem 2rem', borderRadius: '8px',
        maxWidth: '400px', width: '90%'
      }}>
        <h2>📁 Move File To:</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {!isInRoot && (
            <li style={{ marginBottom: '0.75rem' }}>
              <button
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  textAlign: 'left',
                  background: '#e8f0ff',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={() => onSelect({ original: '__ROOT__' })}
              >
                🏠 Move to root
              </button>
            </li>
          )}
          {folders.length === 0 && <li style={{ opacity: 0.6 }}>No folders found</li>}
          {folders.map((folder, i) => (
            <li key={i} style={{ marginBottom: '0.75rem' }}>
              <button
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  textAlign: 'left',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => onSelect(folder)}
              >
                📁 {folder.original}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{
            marginTop: '1rem',
            background: '#ddd',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default MoveModal;
