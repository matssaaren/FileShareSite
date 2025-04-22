import React, { useRef } from 'react';

function FileModal({ category, path, file, onClose }) {
  const videoRef = useRef(null);
  if (!file) return null;

  const fileUrl = `http://localhost:5000/uploads/${category}/${path ? path + '/' : ''}${file.uuid}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.original);
  const isVideo = /\.(mp4|webm|ogg|mkv|mov|avi|flv|wmv|mpeg|mpg|3gp)$/i.test(file.original);

  const handleDownload = () => {
    const encodedPath = encodeURIComponent(path);
    const downloadUrl = `http://localhost:5000/download/${category}/${file.uuid}?path=${encodedPath}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.original);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullView = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%',
      height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', padding: '2rem', position: 'relative',
        maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', borderRadius: '8px'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10, fontSize: '1.25rem', background: 'none', border: 'none', cursor: 'pointer'
        }}>✖</button>
        <h2 style={{ wordBreak: 'break-word' }}>{file.original}</h2>

        {isImage && (
          <img
            src={fileUrl}
            alt={file.original}
            style={{ maxWidth: '100%', maxHeight: '70vh', marginTop: '1rem' }}
          />
        )}

        {isVideo && (
          <video
            ref={videoRef}
            controls
            style={{ maxWidth: '100%', maxHeight: '70vh', marginTop: '1rem' }}
          >
            <source src={fileUrl} />
            Your browser does not support video playback.
          </video>
        )}

        {!isImage && !isVideo && (
          <div style={{ marginTop: '1rem' }}>
            <p>No preview available for this file type.</p>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDownload} className="button">⬇ Download</button>
          {isVideo && (
            <button onClick={handleFullView} className="button">🖥 Full View</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileModal;
