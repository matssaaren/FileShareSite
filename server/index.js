const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const baseUploadDir = path.join(__dirname, 'uploads');
const logFilePath = path.join(__dirname, 'logs.json');
const categories = ['images', 'videos', 'other'];

categories.forEach(cat => fs.ensureDirSync(path.join(baseUploadDir, cat)));

function loadMeta(folderPath) {
  const metaPath = path.join(folderPath, 'meta.json');
  try {
    const content = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, 'utf-8') : '';
    return content.trim() ? JSON.parse(content) : [];
  } catch {
    return [];
  }
}

function saveMeta(folderPath, data) {
  const metaPath = path.join(folderPath, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

function logAction({ ip, action, file, category, path }) {
  const log = {
    ip,
    action,
    file,
    category,
    path,
    timestamp: new Date().toISOString()
  };

  let logs = [];
  try {
    const content = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf-8') : '';
    logs = content.trim() ? JSON.parse(content) : [];
  } catch {
    logs = [];
  }

  logs.unshift(log);
  fs.writeFileSync(logFilePath, JSON.stringify(logs.slice(0, 500), null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || 'other';
    const subPath = req.query.path || '';
    const uploadPath = path.join(baseUploadDir, category, subPath);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({ storage });

app.post('/upload', (req, res) => {
  upload.array('files', 50)(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || req.files.length === 0) return res.status(400).send('No files uploaded.');

    const category = req.query.category || 'other';
    const subPath = req.query.path || '';
    const folderPath = path.join(baseUploadDir, category, subPath);
    const meta = loadMeta(folderPath);

    req.files.forEach(file => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uuid = path.basename(file.filename);

      meta.push({
        uuid,
        original: file.originalname,
        type: 'file',
        timestamp: Date.now(),
        extension: ext
      });

      logAction({
        ip: req.ip,
        action: 'upload',
        file: file.originalname,
        category,
        path: subPath
      });
    });

    saveMeta(folderPath, meta);
    res.json({ success: true });
  });
});

app.get('/files', (req, res) => {
  const { category, path: subPath = '', search = '', sort = 'name' } = req.query;
  const folderPath = path.join(baseUploadDir, category, subPath);
  let meta = loadMeta(folderPath);

  if (search) {
    meta = meta.filter(item => item.original.toLowerCase().includes(search.toLowerCase()));
  }

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

  res.json(meta);
});

app.post('/folder', (req, res) => {
  const { category, path: subPath = '', folderName } = req.body;
  const parentPath = path.join(baseUploadDir, category, subPath);
  const newFolderPath = path.join(parentPath, folderName);
  fs.ensureDirSync(newFolderPath);

  const meta = loadMeta(parentPath);
  const exists = meta.find(entry => entry.original === folderName && entry.type === 'folder');
  if (!exists) {
    meta.push({
      uuid: folderName,
      original: folderName,
      type: 'folder',
      timestamp: Date.now()
    });
    saveMeta(parentPath, meta);
  }

  logAction({ ip: req.ip, action: 'create_folder', file: folderName, category, path: subPath });
  res.json({ success: true });
});

app.post('/delete', (req, res) => {
    const { category, path: subPath, name } = req.body;
    const folderPath = path.join(baseUploadDir, category, subPath || '');
    const meta = loadMeta(folderPath);
  
    const item = meta.find(m => m.uuid === name || m.original === name);
    if (!item) return res.status(404).send('Item not found');
  
    const updatedMeta = meta.filter(entry => entry.uuid !== item.uuid);
    saveMeta(folderPath, updatedMeta);
  
    // If it's a file, remove it from disk
    if (item.type === 'file') {
      const filePath = path.join(folderPath, item.uuid);
      fs.remove(filePath, err => {
        if (err) return res.status(500).send('Failed to delete file from disk');
        logAction({ ip: req.ip, action: 'delete', file: item.original, category, path: subPath });
        res.json({ success: true });
      });
    } else {
      // If it's a folder, just update meta
      logAction({ ip: req.ip, action: 'delete', file: item.original, category, path: subPath });
      res.json({ success: true });
    }
  });
  

app.post('/rename', (req, res) => {
  const { category, path: subPath, oldName, newName } = req.body;
  const folderPath = path.join(baseUploadDir, category, subPath || '');
  const meta = loadMeta(folderPath);

  const file = meta.find(item => item.original === oldName);
  if (!file) return res.status(404).send('File not found');

  file.original = newName;
  saveMeta(folderPath, meta);

  logAction({
    ip: req.ip,
    action: 'rename',
    file: `${oldName} ➡ ${newName}`,
    category,
    path: subPath
  });
  res.json({ success: true });
});

app.post('/move', (req, res) => {
  const { category, srcPath = '', destPath = '', name } = req.body;
  const srcFolder = path.join(baseUploadDir, category, srcPath);
  const destFolder = path.join(baseUploadDir, category, destPath);
  const srcMeta = loadMeta(srcFolder);
  const destMeta = loadMeta(destFolder);

  const file = srcMeta.find(item => item.uuid === name);
  if (!file) return res.status(404).send('File not found');

  fs.ensureDirSync(destFolder);
  fs.move(path.join(srcFolder, name), path.join(destFolder, name), { overwrite: true }, err => {
    if (err) return res.status(500).send('Move failed');

    const updatedSrc = srcMeta.filter(item => item.uuid !== name);
    saveMeta(srcFolder, updatedSrc);
    destMeta.push(file);
    saveMeta(destFolder, destMeta);

    logAction({
      ip: req.ip,
      action: 'move',
      file: `${file.original} ➡ ${destPath || '/'}`,
      category,
      path: srcPath
    });

    res.json({ success: true });
  });
});

app.get('/download/:category/:uuid', (req, res) => {
  const { category, uuid } = req.params;
  const subPath = req.query.path || '';
  const folderPath = path.join(baseUploadDir, category, subPath);
  const meta = loadMeta(folderPath);

  const fileMeta = meta.find(f => f.uuid === uuid);
  if (!fileMeta) return res.status(404).send('File not found');

  const filePath = path.join(folderPath, uuid);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found on disk');
  }

  logAction({
    ip: req.ip,
    action: 'download',
    file: fileMeta.original,
    category,
    path: subPath
  });

  res.download(filePath, fileMeta.original);
});

app.get('/admin/logs', (req, res) => {
  let logs = [];
  try {
    const content = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf-8') : '';
    logs = content.trim() ? JSON.parse(content) : [];
  } catch {
    logs = [];
  }

  logAction({
    ip: req.ip,
    action: 'view_logs',
    file: '-',
    category: '-',
    path: '-'
  });

  res.json(logs);
});

const { exec } = require('child_process');

async function getFolderSizeNative(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const sizes = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return await getFolderSizeNative(fullPath);
    } else if (entry.isFile()) {
      const { size } = await fs.promises.stat(fullPath);
      return size;
    } else {
      return 0;
    }
  }));
  return sizes.reduce((acc, size) => acc + size, 0);
}

app.get('/admin/disk-usage', async (req, res) => {
  console.log('Disk usage route called');
  const uploadsDir = path.join(__dirname, 'uploads');

  try {
    const uploadedBytes = await getFolderSizeNative(uploadsDir);
    const uploaded = uploadedBytes / (1024 ** 3); // bytes → GB

    exec('powershell -command "Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\" | Select-Object Size,FreeSpace | ConvertTo-Json"', (err, stdout, stderr) => {
      if (err || stderr) {
        console.error('PowerShell disk check failed', err || stderr);
        return res.status(500).json({ error: 'Failed to get disk info' });
      }

      try {
        const stats = JSON.parse(stdout.trim());
        const total = stats.Size / (1024 ** 3);
        const free = stats.FreeSpace / (1024 ** 3);
        const used = total - free;
        const system = used - uploaded;

        res.json({
          uploaded: +uploaded.toFixed(2),
          free: +free.toFixed(2),
          system: +system.toFixed(2),
          total: +total.toFixed(2)
        });
      } catch (parseErr) {
        console.error('Failed to parse disk info JSON:', parseErr);
        return res.status(500).json({ error: 'Failed to parse disk info' });
      }
    });
  } catch (e) {
    console.error('Disk usage route failed:', e);
    res.status(500).json({ error: 'Disk usage route failed unexpectedly' });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
