import { FeatureGroup, TileLayer } from "react-leaflet";
import { MapContainer } from "./MapContainer";
import { LatLngTuple } from "leaflet";
import { EditControl } from "react-leaflet-draw";

const center: LatLngTuple = [43.322126, 21.895462];

function App() {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      smoothWheelZoom
      smoothSensitivity={1}
    >
      <FeatureGroup>
        <EditControl position="topright" draw={{}} />
      </FeatureGroup>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}

export default App;
