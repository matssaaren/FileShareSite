import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css';

ChartJS.register(ArcElement, Tooltip, Legend);

function AdminPanel() {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('all');
  const [diskData, setDiskData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/admin/logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Failed to fetch logs', err));

    axios.get('http://localhost:5000/admin/disk-usage')
      .then(res => setDiskData(res.data))
      .catch(err => console.error('Failed to fetch disk usage', err));
  }, []);

  const getActionBadge = (action) => {
    const map = {
      upload: '#4caf50',
      download: '#2196f3',
      delete: '#f44336',
      rename: '#ff9800',
      move: '#9c27b0',
      create_folder: '#00bcd4',
      view_logs: '#607d8b'
    };
    const color = map[action] || '#757575';
    return (
      <span style={{
        background: color,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        textTransform: 'capitalize'
      }}>
        {action.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="admin-panel">
      <h1>📜 Admin Logs</h1>

      {diskData && (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem'
  }}>
    <h2 style={{ textAlign: 'center' }}>💾 Disk Usage</h2>
    <div style={{ maxWidth: 400, width: '100%' }}>
      <Pie
        data={{
          labels: ['Uploaded Files', 'Free Space', 'System'],
          datasets: [{
            label: 'GB',
            data: [diskData.uploaded, diskData.free, diskData.system],
            backgroundColor: ['#4caf50', '#2196f3', '#9e9e9e'],
            borderWidth: 1
          }]
        }}
        options={{
          plugins: {
            legend: { position: 'bottom' }
          }
        }}
      />
    </div>
    <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
      Total Disk: {diskData.total} GB
    </p>
  </div>
)}


      <div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Actions</option>
          <option value="upload">Upload</option>
          <option value="download">Download</option>
          <option value="rename">Rename</option>
          <option value="move">Move</option>
          <option value="delete">Delete</option>
          <option value="create_folder">Create Folder</option>
          <option value="view_logs">View Logs</option>
        </select>
      </div>

      <table className="log-table">
        <thead>
          <tr>
            <th>📅 Time</th>
            <th>👤 IP</th>
            <th>⚙️ Action</th>
            <th>📂 Category</th>
            <th>📁 Path</th>
            <th>📄 File</th>
          </tr>
        </thead>
        <tbody>
          {logs
            .filter(log => actionFilter === 'all' || log.action === actionFilter)
            .map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.ip.replace(/^::ffff:/, '')}</td>
                <td>{getActionBadge(log.action)}</td>
                <td>{log.category}</td>
                <td>{log.path || '/'}</td>
                <td style={{ wordBreak: 'break-word' }}>{log.file}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
