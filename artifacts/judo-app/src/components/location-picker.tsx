import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
  onAddressChange: (address: string) => void;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ address, lat, lng, onAddressChange, onLocationChange }: LocationPickerProps) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const defaultLat = lat ?? 55.75;
    const defaultLng = lng ?? 37.61;
    leafletMap.current = L.map(mapRef.current).setView([defaultLat, defaultLng], lat ? 14 : 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap.current);
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(leafletMap.current);
    }
    leafletMap.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(leafletMap.current!);
      }
      onLocationChange(clickLat, clickLng);
    });
    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !lat || !lng) return;
    leafletMap.current.setView([lat, lng], 14);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(leafletMap.current);
    }
  }, [lat, lng]);

  const geocode = async () => {
    if (!address.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "ru,en" } });
      const data = await res.json();
      if (data.length === 0) {
        setError("Место не найдено. Попробуйте уточнить адрес.");
        return;
      }
      const { lat: foundLat, lon: foundLng } = data[0];
      onLocationChange(parseFloat(foundLat), parseFloat(foundLng));
    } catch {
      setError("Ошибка поиска. Проверьте подключение к интернету.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        Место проведения
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="Введите адрес или название места..."
          value={address}
          onChange={e => onAddressChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), geocode())}
        />
        <Button type="button" variant="outline" size="icon" onClick={geocode} disabled={searching} title="Найти на карте">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          Координаты: {lat.toFixed(5)}, {lng.toFixed(5)} · Кликните по карте для уточнения
        </p>
      )}
      <div
        ref={mapRef}
        className="rounded-md border overflow-hidden"
        style={{ height: 220 }}
      />
    </div>
  );
}
