import React from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Example GeoJSON outline (replace with your own data)
const countriesOutline = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Country Example", "info": "Sample info for tooltip" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [0, 0], [0, 10], [10, 10], [10, 0], [0, 0]
          ]
        ]
      }
    }
  ]
};

const DashboardTab = () => {
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer center={[5, 5]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON data={countriesOutline}>
          {(layer) => (
            <Tooltip sticky>{layer.feature.properties.info}</Tooltip>
          )}
        </GeoJSON>
      </MapContainer>
    </div>
  );
};

export default DashboardTab;
