import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function UserManagementTab() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');

  useEffect(() => {
    // Fetch regions from backend API
    fetch('/api/regions/')
      .then(res => res.json())
      .then(data => setRegions(data.regions || []));
  }, []);

  // Example GeoJSON outline for regions (replace with real data)
  const regionsGeoJSON = {
    "type": "FeatureCollection",
    "features": regions.map((region, idx) => ({
      "type": "Feature",
      "properties": { "name": region, "info": `Info for ${region}` },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [idx * 10, 0], [idx * 10, 10], [idx * 10 + 5, 10], [idx * 10 + 5, 0], [idx * 10, 0]
          ]
        ]
      }
    }))
  };

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

      {/* Interactive Map */}
      <div style={{ height: "400px", width: "100%", marginTop: "2em" }}>
        <MapContainer center={[5, 5]} zoom={2} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {regions.length > 0 && (
            <GeoJSON 
              data={regionsGeoJSON}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(feature.properties.info, { sticky: true });
              }}
              style={{
                color: '#3388ff',
                weight: 2,
                fillOpacity: 0.1
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default UserManagementTab;
