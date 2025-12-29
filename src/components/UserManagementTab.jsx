import React, { useEffect, useState } from 'react';

function UserManagementTab() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');

  useEffect(() => {
    // Fetch regions from backend API
    fetch('/api/regions/')
      .then(res => res.json())
      .then(data => setRegions(data.regions || []));
  }, []);

  return (
    <div>
      <h2>Commercial Structure Management</h2>
      <label htmlFor="region-select">Select Region:</label>
      <select id="region-select" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
        <option value="">-- Select --</option>
        {regions.map(region => (
          <option key={region} value={region}>{region}</option>
        ))}
      </select>
    </div>
  );
}

export default UserManagementTab;
