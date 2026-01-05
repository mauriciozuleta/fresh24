import React from 'react';

const ImportTab = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Competitive Prices Import</h2>
      <iframe
        src="/user_imported_data/competitive_prices.html"
        title="Competitive Prices Import"
        style={{ width: '100%', height: '90vh', border: '1px solid #2196f3', borderRadius: '8px', background: '#fff' }}
      />
    </div>
  );
};

export default ImportTab;
