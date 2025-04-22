import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CategoryView from './CategoryView';
import AdminPanel from './AdminPanel';
import './style.css';

function App() {
  return (
    <Router>
      <div className="upload-section">
        <h1>Select a Category</h1>
        <div className="categories">
          <Link to="/category/images"><button className="button red">Images</button></Link>
          <Link to="/category/videos"><button className="button green">Videos</button></Link>
          <Link to="/category/other"><button className="button blue">Other Files</button></Link>
        </div>
      </div>

      <Routes>
        <Route path="/category/:category" element={<CategoryView />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
