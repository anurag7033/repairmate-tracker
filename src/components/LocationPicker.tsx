import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fix default marker icon (Leaflet + bundlers)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  pincode: string;
}

interface Props {
  onLocationSelect: (loc: PickedLocation) => void;
  initialLat?: number;
  initialLng?: number;
}

const DEFAULT_CENTER: [number, number] = [23.6102, 85.2799]; // Ranchi-ish default

const Recenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
};

const ClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationPicker = ({ onLocationSelect, initialLat, initialLng }: Props) => {
  const { toast } = useToast();
  const [pos, setPos] = useState<[number, number]>([
    initialLat ?? DEFAULT_CENTER[0],
    initialLng ?? DEFAULT_CENTER[1],
  ]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reversing, setReversing] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  const reverseGeocode = async (lat: number, lng: number) => {
    setReversing(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const a = data.address || {};
      const address = data.display_name || "";
      const city = a.city || a.town || a.village || a.suburb || a.county || "";
      const pincode = a.postcode || "";
      onLocationSelect({ lat, lng, address, city, pincode });
    } catch {
      toast({ title: "Couldn't fetch address", variant: "destructive" });
    } finally {
      setReversing(false);
    }
  };

  const handlePick = (lat: number, lng: number) => {
    setPos([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&countrycodes=in&limit=1`,
      );
      const data = await res.json();
      if (data.length === 0) {
        toast({ title: "No results", description: "Try a different search", variant: "destructive" });
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      handlePick(lat, lng);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        handlePick(p.coords.latitude, p.coords.longitude);
        setLocating(false);
      },
      () => {
        toast({ title: "Couldn't get your location", description: "Allow location access", variant: "destructive" });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address, area, landmark..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching} variant="outline">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
        <Button type="button" onClick={useMyLocation} disabled={locating} variant="outline" title="Use my location">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </Button>
      </form>

      <div className="relative h-64 rounded-xl overflow-hidden border border-border">
        <MapContainer center={pos} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={pos}
            draggable
            icon={markerIcon}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const m = markerRef.current;
                if (m) {
                  const ll = m.getLatLng();
                  handlePick(ll.lat, ll.lng);
                }
              },
            }}
          />
          <ClickHandler onClick={handlePick} />
          <Recenter lat={pos[0]} lng={pos[1]} />
        </MapContainer>
        {reversing && (
          <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded-md text-xs flex items-center gap-1 shadow">
            <Loader2 className="w-3 h-3 animate-spin" /> Fetching address...
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Tap on the map, drag the pin, or search to set your exact location.
      </p>
    </div>
  );
};

export default LocationPicker;
