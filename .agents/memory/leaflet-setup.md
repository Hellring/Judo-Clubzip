---
name: Leaflet map setup in Vite
description: How to fix broken marker icons and set up Leaflet properly in a Vite/React project
---

## The rule
In Vite builds, Leaflet's default marker icons break because the asset bundler renames files. Fix by manually overriding the icon URLs after import:

```typescript
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
```

**Why:** Leaflet internally calls `_getIconUrl` to resolve icon paths from the bundled assets. In Vite, those paths are hashed and can't be resolved. Using unpkg CDN URLs bypasses this entirely.

**How to apply:** Always include this fix in any component that uses `L.Marker` or `L.map` in a Vite project.

## Geocoding
For address geocoding without an API key, use Nominatim (OpenStreetMap):
```
https://nominatim.openstreetmap.org/search?q=<address>&format=json&limit=1
```
No API key required. Include `Accept-Language: ru,en` header for localized results.
