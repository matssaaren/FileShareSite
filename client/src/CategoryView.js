import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import FileModal from './FileModal';
import MoveModal from './MoveModal';

const API = 'http://localhost:5000';

function CategoryView() {
  const { category } = useParams();
  const [path, setPath] = useState('');
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [modalFile, setModalFile] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef();

  const [draggedFileId, setDraggedFileId] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [folderList, setFolderList] = useState([]);

  const [renameModal, setRenameModal] = useState({ open: false, uuid: null, currentName: '' });
  const [newName, setNewName] = useState('');

  const fetchItems = useCallback(async () => {
    const res = await axios.get(`${API}/files`, {
      params: { category, path, search, sort }
    });

    let meta = res.data;

    if (sort === 'date') {
      meta.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      meta.sort((a, b) => a.original.localeCompare(b.original));
    }

    meta.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0;
    });

    setItems(meta);
  }, [category, path, search, sort]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const uploadFiles = async (e) => {
    e.preventDefault();
    if (!files.length) return;

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    setUploadProgress(0);
    setUploadStatus('Uploading...');

    try {
      await axios.post(
        `${API}/upload?category=${encodeURIComponent(category)}&path=${encodeURIComponent(path)}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      );

      setUploadStatus('✅ Done!');
      setTimeout(() => setUploadStatus(''), 2000);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchItems();
    } catch (err) {
      setUploadStatus('❌ Upload failed');
    }
  };

  const createFolder = async () => {
    if (!folderName) return;
    await axios.post(`${API}/folder`, { category, path, folderName });
    setFolderName('');
    fetchItems();
  };

  const openRenameModal = (uuid, original) => {
    setRenameModal({ open: true, uuid, currentName: original });
    setNewName(original);
  };

  const submitRename = async () => {
    if (!newName.trim()) return;
    await axios.post(`${API}/rename`, {
      category,
      path,
      oldName: renameModal.currentName,
      newName: newName.trim()
    });
    setRenameModal({ open: false, uuid: null, currentName: '' });
    fetchItems();
  };

  const deleteItem = async (uuid) => {
    await axios.post(`${API}/delete`, { category, path, name: uuid });
    fetchItems();
  };

  const moveItem = async (uuid, destPath) => {
    await axios.post(`${API}/move`, {
      category,
      srcPath: path,
      destPath,
      name: uuid
    });
    fetchItems();
  };

  const handleDrop = (e, folderName) => {
    e.preventDefault();
    if (!draggedFileId) return;
    const destPath = path ? `${path}/${folderName}` : folderName;
    moveItem(draggedFileId, destPath);
    setDraggedFileId(null);
  };

  const openFolder = (name) => {
    setPath(prev => (prev ? `${prev}/${name}` : name));
  };

  const goBack = () => {
    const parts = path.split('/');
    parts.pop();
    setPath(parts.join('/'));
  };

  const getPreview = (item) => {
    const fileUrl = `${API}/uploads/${category}/${path ? path + '/' : ''}${item.uuid}`;
    const ext = item.extension || item.original.split('.').pop().toLowerCase();

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(ext)) {
      return (
        <img
          src={fileUrl}
          alt={item.original}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
          onClick={() => setModalFile(item)}
        />
      );
    }

    if (/\.(mp4|webm|ogg|mkv|mov|avi|flv|wmv|mpeg|mpg|3gp)$/i.test(ext)) {
      return (
        <div
          style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }}
          onClick={() => setModalFile(item)}
        >
          <video
            muted
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
          >
            <source src={fileUrl} />
          </video>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '32px', color: '#fff',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '50%',
            width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>▶</div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          fontSize: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f4f4',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        onClick={() => setModalFile(item)}
      >
        📄
      </div>
    );
  };

  return (
    <div className="download-section">
      {/* TOOLBAR */}
      <div className="toolbar-box">
        <div className="toolbar-section">
          <label htmlFor="file-upload" className="file-upload-label">
            📁 Choose Files
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => setFiles([...e.target.files])}
            />
          </label>
          <button className="upload-button" onClick={uploadFiles}>⬆️ Upload</button>
        </div>

        <div className="toolbar-section">
          <input
            className="text-input"
            placeholder="📁 New folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
          <button className="action-button" onClick={createFolder}>➕ Create</button>
        </div>

        <div className="toolbar-section">
          <input
            className="text-input"
            placeholder="🔍 Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="text-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>

        

        {files.length > 0 && (
          <div className="file-preview-list">
            {files.map((file, idx) => (
              <div key={idx} className="file-preview-item">{file.name}</div>
            ))}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="upload-progress-wrapper">
            <progress value={uploadProgress} max="100" className="upload-progress-bar" />
        </div>
        )}
      </div>
      {path && <button onClick={goBack}>⬅️ Back</button>}
      <p className="path-indicator">
        📂 {category.toUpperCase()} {path ? ` / ${path}` : ''}
        </p>
      {/* FILE GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '1rem',
        marginTop: '2rem'
      }}>
        {items.map(item => (
          <div
            key={item.uuid}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '0.5rem',
              background: '#fff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '180px',
              overflow: 'hidden'
            }}
            draggable={item.type === 'file'}
            onDragStart={() => item.type === 'file' && setDraggedFileId(item.uuid)}
            onDragOver={(e) => item.type === 'folder' && e.preventDefault()}
            onDrop={(e) => item.type === 'folder' && handleDrop(e, item.original)}
          >
            <div style={{ height: '100px', marginBottom: '0.5rem' }}>
              {item.type === 'folder' ? (
                <div
                  onClick={() => openFolder(item.original)}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f8ff',
                    fontSize: '3rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  📁
                </div>
              ) : (
                getPreview(item)
              )}
            </div>

            <div style={{ fontSize: '0.85rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {item.original}
            </div>

            {item.type === 'file' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <button onClick={() => openRenameModal(item.uuid, item.original)}>✏️</button>
                <button onClick={() => deleteItem(item.uuid)}>🗑️</button>
                <button onClick={() => {
                  const foldersOnly = items.filter(i => i.type === 'folder');
                  setFolderList(foldersOnly);
                  setMoveTarget(item);
                }}>📁</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modalFile && (
        <FileModal
          category={category}
          path={path}
          file={modalFile}
          onClose={() => setModalFile(null)}
        />
      )}

      {moveTarget && (
        <MoveModal
          folders={folderList}
          isInRoot={path === ''}
          onSelect={async (folder) => {
            const destPath = folder.original === '__ROOT__'
              ? ''
              : (path ? `${path}/${folder.original}` : folder.original);
            await moveItem(moveTarget.uuid, destPath);
            setMoveTarget(null);
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {renameModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#fff', padding: '1.5rem', borderRadius: '8px',
            maxWidth: '400px', width: '90%'
          }}>
            <h2>Rename File</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setRenameModal({ open: false, uuid: null, currentName: '' })}>Cancel</button>
              <button onClick={submitRename}>Rename</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryView;
