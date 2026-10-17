import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  AlertCircle,
  Layers,
  ArrowRight,
  RotateCcw,
  Compass,
  Info,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "../api";

// Fix Leaflet standard marker icon paths in bundled environments
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BANGLADESH_CENTER: [number, number] = [23.6850, 90.3563];
const BANGLADESH_ZOOM = 7;

interface District {
  district_name_en: string;
  district_name_bn: string;
  division: string;
  lat: number;
  lng: number;
  classification?: string;
}

interface LocationSearchResult {
  type: "DISTRICT" | "UPAZILA" | "MOUZA";
  name_en: string;
  name_bn: string;
  division?: string;
  parent_district?: string;
  district?: string;
  upazila?: string;
  jl_no?: number;
  lat: number;
  lng: number;
  zoom_level: number;
  urban_type?: string;
  cadastral_code?: string;
}

interface ParcelGIS {
  parcel_id: string;
  district_name_en: string;
  district_name_bn: string;
  upazila_name_en: string;
  upazila_name_bn: string;
  mouza_name_en: string;
  mouza_name_bn: string;
  area_decimal: number;
  land_classification_bn: string;
  urban_rural: string;
  survey_type: string;
  center_coordinates: [number, number];
  boundary_geojson: {
    type: "Feature";
    geometry: {
      type: "Polygon";
      coordinates: number[][][];
    };
    properties: Record<string, unknown>;
  };
  provenance: {
    administrative_source: string;
    cadastral_polygon_type: string;
    coordinates_provenance: string;
    accuracy_disclaimer_bn: string;
  };
}

interface BangladeshMapProps {
  token: string;
  initialParcelId?: string;
  lang: "bn" | "en";
  onSelectParcel?: (parcelId: string) => void;
  onNavigateWorkflow?: (target: string) => void;
}

export const BangladeshMap: React.FC<BangladeshMapProps> = ({
  token,
  initialParcelId = "LS-PARCEL-000001",
  lang,
  onSelectParcel,
  onNavigateWorkflow,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const parcelLayerRef = useRef<L.LayerGroup | null>(null);
  const districtMarkersRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.LayerGroup | null>(null);

  const [districts, setDistricts] = useState<District[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [parcelData, setParcelData] = useState<ParcelGIS | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetParcelId, setTargetParcelId] = useState(initialParcelId);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet map with Bangladesh geographic center
    const map = L.map(mapContainerRef.current, {
      center: BANGLADESH_CENTER,
      zoom: BANGLADESH_ZOOM,
      minZoom: 6,
      maxZoom: 19,
      zoomControl: false,
    });

    // 1. DEFAULT BASEMAP: OpenStreetMap Standard
    // Public open data, 100% free, zero API key required, reliable worldwide raster tiles.
    const osmStandard = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    // 2. SECONDARY BASEMAP: Esri World Imagery (Satellite)
    // Keyless public imagery service for satellite land boundaries and terrain context.
    const esriSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      }
    );

    // Set OSM Standard as active default layer immediately
    osmStandard.addTo(map);

    const baseMaps: Record<string, L.TileLayer> = {
      [lang === "bn" ? "ওপেনস্ট্রিটম্যাপ (ডিফল্ট)" : "OpenStreetMap (Standard)"]: osmStandard,
      [lang === "bn" ? "স্যাটেলাইট দৃশ্য (Esri)" : "Satellite View (Esri)"]: esriSatellite,
    };

    // 3. OPTIONAL PREMIUM: CARTO Dark Matter (ONLY if configured with a valid API key)
    // Never make requests to CARTO unless user explicitly supplied an API key to avoid "API KEY REQUIRED" watermark!
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
    if (cartoApiKey && typeof cartoApiKey === "string" && cartoApiKey.trim().length > 0) {
      const cartoDark = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(
          cartoApiKey.trim()
        )}`,
        {
          attribution:
            '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      );
      baseMaps[lang === "bn" ? "কার্টো ডার্ক (প্রিমিয়াম কী)" : "CARTO Dark (With API Key)"] = cartoDark;
    }

    // Add Layer Control in top-right
    L.control.layers(baseMaps, undefined, { position: "topright" }).addTo(map);

    // Add Zoom Control in top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Create Layer Groups
    districtMarkersRef.current = L.layerGroup().addTo(map);
    parcelLayerRef.current = L.layerGroup().addTo(map);
    searchMarkerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Invalidate map size on window resize and container layout changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lang]);

  // Fetch Districts on Mount
  useEffect(() => {
    apiRequest<{ districts: District[] }>("/api/v1/gis/districts")
      .then((res) => {
        setDistricts(res.districts || []);
      })
      .catch((err) => {
        console.error("Failed to load districts:", err);
      });
  }, []);

  // Render 64 District Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = districtMarkersRef.current;
    if (!map || !layer || districts.length === 0) return;

    layer.clearLayers();

    districts.forEach((d) => {
      const circle = L.circleMarker([d.lat, d.lng], {
        radius: 5,
        color: "#087d84",
        fillColor: "#5ee6cb",
        fillOpacity: 0.85,
        weight: 1.5,
      });

      const label = lang === "bn" ? d.district_name_bn : d.district_name_en;
      circle.bindTooltip(`${label} (${d.division})`, {
        permanent: false,
        direction: "top",
        className: "gis-district-tooltip",
      });

      circle.on("click", () => {
        setSelectedDistrict(d);
        map.flyTo([d.lat, d.lng], 10, { duration: 1.2 });
      });

      circle.addTo(layer);
    });
  }, [districts, lang]);

  // Load Parcel GIS
  const loadParcelGIS = async (id: string) => {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setShowSearchResults(false);

    try {
      const data = await apiRequest<ParcelGIS>(`/api/v1/gis/parcels/${encodeURIComponent(cleanId)}`, {
        token,
      });
      setParcelData(data);
      renderParcelOnMap(data);
      if (onSelectParcel) {
        onSelectParcel(cleanId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parcel GIS resolution failed");
    } finally {
      setLoading(false);
    }
  };

  // Render Parcel Polygon and Centroid on Map
  const renderParcelOnMap = (gis: ParcelGIS) => {
    const map = mapInstanceRef.current;
    const layer = parcelLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Polygon coordinates from GeoJSON: [lng, lat] -> Leaflet requires [lat, lng]
    const rawCoords = gis.boundary_geojson?.geometry?.coordinates?.[0];
    if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length < 3) {
      console.warn("Invalid or missing boundary coordinates for parcel:", gis.parcel_id);
      return;
    }

    const latLngs: [number, number][] = [];
    for (const c of rawCoords) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const [lng, lat] = c;
      if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
        latLngs.push([lat, lng]);
      }
    }

    if (latLngs.length < 3) {
      console.warn("Insufficient valid coordinates to render polygon:", gis.parcel_id);
      return;
    }

    // Distinct High-Contrast Polygon for the Parcel
    const polygon = L.polygon(latLngs, {
      color: "#087d84",
      weight: 3,
      fillColor: "#5ee6cb",
      fillOpacity: 0.45,
    });

    const popupHtml = `
      <div style="font-family: inherit; color: #e7eef8; min-width: 230px; padding: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 14px; color: #5ee6cb;">${gis.parcel_id}</strong>
          <span style="font-size: 10px; background: #162c3d; padding: 2px 6px; border-radius: 4px; color: #8da2b7; font-weight: 700;">
            ${gis.survey_type}
          </span>
        </div>
        <div style="font-size: 12px; margin-bottom: 3px;">
          <strong>মৌজা:</strong> ${gis.mouza_name_bn} (${gis.mouza_name_en})
        </div>
        <div style="font-size: 11px; color: #9bb7cf; margin-bottom: 3px;">
          <strong>উপজেলা:</strong> ${gis.upazila_name_bn} · <strong>জেলা:</strong> ${gis.district_name_bn}
        </div>
        <div style="font-size: 12px; color: #f2c77c; font-weight: 700; margin-bottom: 3px;">
          জমির আয়তন: ${gis.area_decimal} শতাংশ (${gis.land_classification_bn})
        </div>
        <div style="font-size: 10px; color: #8da2b7; margin-bottom: 8px;">
          প্রশাসনিক ধরণ: ${gis.urban_rural === "URBAN" ? "পৌরসভা / সিটি কর্পোরেশন" : "পল্লী এলাকা"}
        </div>
        <div style="padding: 5px 8px; background: rgba(242, 199, 124, 0.15); border: 1px solid #f2c77c; border-radius: 6px; font-size: 10px; color: #f2c77c; line-height: 1.4;">
          <strong>⚠ সিন্থেটিক ডেমো জ্যামিতি (Synthetic / Demonstration Geometry)</strong><br/>
          সরকারি নকশা ও দাগ সীমানা নিশ্চিত করতে ভূমি অফিসের খতিয়ান ও আমিন দ্বারা মাঠ জরিপ আবশ্যক।
        </div>
      </div>
    `;

    polygon.bindPopup(popupHtml);
    polygon.addTo(layer);

    // Centroid Pulse Marker
    const centroidMarker = L.circleMarker(gis.center_coordinates, {
      radius: 7,
      color: "#ff9e9a",
      fillColor: "#e65100",
      fillOpacity: 0.95,
      weight: 2,
    });
    centroidMarker.bindPopup(
      `<div style="color: #e7eef8; font-size: 12px; padding: 4px;"><strong>${gis.parcel_id}</strong><br/>অক্ষাংশ-দ্রাঘিমাংশ কেন্দ্রবিন্দু (${gis.center_coordinates[0].toFixed(4)}, ${gis.center_coordinates[1].toFixed(4)})</div>`
    );
    centroidMarker.addTo(layer);

    // Zoom and Pan to parcel polygon bounds
    map.flyToBounds(polygon.getBounds(), { maxZoom: 16, duration: 1.4 });
  };

  // Reset to nationwide Bangladesh overview
  const resetToBangladeshView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(BANGLADESH_CENTER, BANGLADESH_ZOOM, { duration: 1.2 });
    setSelectedDistrict(null);
  };

  // Location / Place Search (District, Upazila, Mouza, or Parcel ID)
  const handleUniversalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setError(null);

    // 1. If it looks like a Parcel ID (e.g. LS-PARCEL-000001 or just a parcel ID)
    if (query.toUpperCase().startsWith("LS-PARCEL") || query.toUpperCase().startsWith("PARCEL")) {
      const normalizedId = query.toUpperCase().startsWith("LS-PARCEL") ? query.toUpperCase() : `LS-${query.toUpperCase()}`;
      setTargetParcelId(normalizedId);
      await loadParcelGIS(normalizedId);
      return;
    }

    // 2. Otherwise search places via GIS location search endpoint
    setLoading(true);
    try {
      const data = await apiRequest<{ results: LocationSearchResult[] }>(
        `/api/v1/gis/search?q=${encodeURIComponent(query)}`
      );
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setShowSearchResults(true);
        // Automatically fly to first matching place
        const first = data.results[0];
        flyToSearchResult(first);
      } else {
        setError(
          lang === "bn"
            ? `"${query}" এর জন্য কোনো জেলা, উপজেলা বা মৌজা পাওয়া যায়নি।`
            : `No matching district, upazila, or mouza found for "${query}".`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const flyToSearchResult = (item: LocationSearchResult) => {
    const map = mapInstanceRef.current;
    const layer = searchMarkerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 9,
      color: "#f2c77c",
      fillColor: "#ff9e9a",
      fillOpacity: 0.9,
      weight: 2,
    });

    const displayName = lang === "bn" ? item.name_bn : item.name_en;
    marker.bindPopup(`
      <div style="color: #e7eef8; font-size: 12px; padding: 4px;">
        <strong style="color: #5ee6cb;">${displayName}</strong> (${item.type})<br/>
        ${item.parent_district ? `জেলা: ${item.parent_district}<br/>` : ""}
        ${item.division ? `বিভাগ: ${item.division}<br/>` : ""}
        অক্ষাংশ: ${item.lat.toFixed(4)}, দ্রাঘিমাংশ: ${item.lng.toFixed(4)}
      </div>
    `);

    marker.addTo(layer);
    map.flyTo([item.lat, item.lng], item.zoom_level || 11, { duration: 1.2 });
    marker.openPopup();
    setShowSearchResults(false);
  };

  // Initial load
  useEffect(() => {
    if (initialParcelId) {
      loadParcelGIS(initialParcelId);
    }
  }, [initialParcelId]);

  return (
    <div className="gis-map-module" style={{ display: "grid", gap: "16px" }}>
      {/* Top Search, District Selector and Overview Controls */}
      <div className="panel" style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Universal Search Form (Parcels, Districts, Upazilas, Mouzas) */}
          <form
            onSubmit={handleUniversalSearch}
            style={{ display: "flex", gap: "8px", flex: "1 1 340px", position: "relative" }}
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "bn"
                  ? "পার্সেল আইডি (LS-PARCEL-000001) বা জেলা/উপজেলা/মৌজা খুঁজুন..."
                  : "Search parcel (LS-PARCEL-000001), district, or mouza..."
              }
              style={{
                flex: 1,
                background: "#081320",
                border: "1px solid #22374d",
                color: "#e7eef8",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Search size={16} /> {lang === "bn" ? "অনুসন্ধান" : "Search"}
            </button>

            {/* Autocomplete / Multi-match dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  background: "#0d1e2e",
                  border: "1px solid #234054",
                  borderRadius: "8px",
                  zIndex: 1000,
                  maxHeight: "220px",
                  overflowY: "auto",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {searchResults.map((res, idx) => (
                  <div
                    key={`${res.type}-${idx}`}
                    onClick={() => flyToSearchResult(res)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #162c3d",
                      fontSize: "12px",
                      color: "#e7eef8",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#162c3d")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>
                      <strong>{lang === "bn" ? res.name_bn : res.name_en}</strong>
                      <span style={{ color: "#8da2b7", marginLeft: "6px", fontSize: "11px" }}>
                        ({res.type}) {res.parent_district ? `· ${res.parent_district}` : ""}
                      </span>
                    </span>
                    <span style={{ color: "#5ee6cb", fontSize: "11px" }}>
                      {lang === "bn" ? "ম্যাপে যান ➔" : "Go ➔"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* District Quick Filter Selector (64 Districts) */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#8da2b7", whiteSpace: "nowrap" }}>
              {lang === "bn" ? "জেলা নির্বাচন:" : "District:"}
            </span>
            <select
              value={selectedDistrict?.district_name_en || ""}
              onChange={(e) => {
                const found = districts.find((d) => d.district_name_en === e.target.value);
                if (found && mapInstanceRef.current) {
                  setSelectedDistrict(found);
                  mapInstanceRef.current.flyTo([found.lat, found.lng], 10, { duration: 1.2 });
                }
              }}
              style={{
                background: "#0d1c2d",
                border: "1px solid #22374d",
                color: "#e7eef8",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                minWidth: "180px",
              }}
            >
              <option value="">
                {lang === "bn" ? "-- ৬৪ জেলা বাছাই করুন --" : "-- Select District (64) --"}
              </option>
              {districts.map((d) => (
                <option key={d.district_name_en} value={d.district_name_en}>
                  {lang === "bn" ? d.district_name_bn : d.district_name_en} ({d.division})
                </option>
              ))}
            </select>

            {/* Reset to Bangladesh Center button */}
            <button
              type="button"
              onClick={resetToBangladeshView}
              title={lang === "bn" ? "সমগ্র বাংলাদেশ ভিউতে ফিরে যান" : "Reset to Full Bangladesh Overview"}
              style={{
                background: "#162c3d",
                border: "1px solid #234054",
                color: "#5ee6cb",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <RotateCcw size={14} />
              {lang === "bn" ? "সমগ্র বাংলাদেশ" : "BD Overview"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#ff9e9a",
              fontSize: "12px",
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </div>

      {/* Main Map + Info Split Screen */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}
        className="gis-grid-layout"
      >
        {/* Leaflet Map Box */}
        <div
          className="panel"
          style={{
            padding: "0",
            overflow: "hidden",
            position: "relative",
            minHeight: "540px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              width: "100%",
              height: "540px",
              background: "#07101c",
              zIndex: 1,
            }}
          />

          {/* Map Overlay Status Badge */}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              zIndex: 10,
              background: "rgba(9, 19, 33, 0.90)",
              backdropFilter: "blur(6px)",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #1f364d",
              fontSize: "11px",
              color: "#8da2b7",
              maxWidth: "360px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#5ee6cb",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              <Layers size={14} /> {lang === "bn" ? "বাংলাদেশ জিআইএস এক্সপ্লোরার" : "Bangladesh GIS Explorer"}
            </div>
            <div>
              {lang === "bn"
                ? "ওপেনস্ট্রিটম্যাপ স্ট্যান্ডার্ড বেসম্যাপ (১০০% উন্মুক্ত ও ওয়াটারমার্কমুক্ত)। স্যাটেলাইট দৃশ্যের জন্য উপরের ডানদিকের স্তর নির্বাচক ব্যবহার করুন।"
                : "OpenStreetMap Standard Basemap (100% Free & Unwatermarked). Use top-right layer control for Satellite view."}
            </div>
          </div>
        </div>

        {/* Right Info Panel & Buyer Journey Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {parcelData ? (
            <div className="panel" style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <span className="tag low" style={{ fontWeight: 700 }}>
                  {parcelData.parcel_id}
                </span>
                <span className="tag info">{parcelData.survey_type} খতিয়ান</span>
              </div>

              <h3 style={{ fontSize: "16px", margin: "6px 0 14px", color: "#e7eef8" }}>
                {lang === "bn" ? parcelData.mouza_name_bn : parcelData.mouza_name_en}{" "}
                {lang === "bn" ? "মৌজা" : "Mouza"}
              </h3>

              <div className="record-data" style={{ fontSize: "12px" }}>
                <div className="record-row">
                  <span>{lang === "bn" ? "জেলা" : "District"}</span>
                  <strong>
                    {lang === "bn" ? parcelData.district_name_bn : parcelData.district_name_en}
                  </strong>
                </div>
                <div className="record-row">
                  <span>{lang === "bn" ? "উপজেলা / থানা" : "Upazila"}</span>
                  <strong>
                    {lang === "bn" ? parcelData.upazila_name_bn : parcelData.upazila_name_en}
                  </strong>
                </div>
                <div className="record-row">
                  <span>{lang === "bn" ? "জমির আয়তন" : "Land Area"}</span>
                  <strong style={{ color: "#5ee6cb" }}>
                    {parcelData.area_decimal} {lang === "bn" ? "শতাংশ" : "Decimals"}
                  </strong>
                </div>
                <div className="record-row">
                  <span>{lang === "bn" ? "ভূমি শ্রেণী" : "Classification"}</span>
                  <strong>{parcelData.land_classification_bn}</strong>
                </div>
                <div className="record-row">
                  <span>{lang === "bn" ? "প্রশাসনিক ধরণ" : "Admin Category"}</span>
                  <strong>
                    {parcelData.urban_rural === "URBAN" ? "পৌরসভা / সিটি কর্পোরেশন" : "পল্লী এলাকা"}
                  </strong>
                </div>
                <div className="record-row">
                  <span>{lang === "bn" ? "জরিপ ধরণ" : "Survey Type"}</span>
                  <strong>{parcelData.survey_type}</strong>
                </div>
              </div>

              {/* Synthetic Cadastral Boundary Disclaimer */}
              <div
                style={{
                  background: "rgba(242, 199, 124, 0.12)",
                  border: "1px solid #f2c77c",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginTop: "14px",
                  fontSize: "11px",
                  color: "#f2c77c",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  <ShieldAlert size={14} />
                  {lang === "bn" ? "সিন্থেটিক ডেমো জ্যামিতি" : "Synthetic / Demonstration Geometry"}
                </div>
                <div>
                  {lang === "bn"
                    ? "এই মানচিত্রের সীমানা ডেমো মৌজা ও কেন্দ্রবিন্দুর আনুমানিক প্রদর্শন। এটি কোনো সরকারি ক্যাডাস্ট্রাল ডিজিটাল সীমানা নয়।"
                    : "Polygon represents synthetic demonstration geometry. Official boundaries require physical survey & certified Mouza maps."}
                </div>
              </div>

              {/* Connected Buyer Journey Actions */}
              {onNavigateWorkflow && (
                <div style={{ display: "grid", gap: "8px", marginTop: "16px" }}>
                  <button
                    className="action-card"
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "1px solid #1c6d5b",
                      background: "#0d232a",
                    }}
                    onClick={() => onNavigateWorkflow("journey")}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#5ee6cb" }}>
                      {lang === "bn" ? "🔍 স্মার্ট ভেরিফিকেশন ও ঝুঁকি স্কোর ➔" : "🔍 Smart Verification & Risk ➔"}
                    </div>
                  </button>
                  <button
                    className="action-card"
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "1px solid #28445e",
                    }}
                    onClick={() => onNavigateWorkflow("journey")}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#8da2b7" }}>
                      {lang === "bn" ? "📜 জরিপ খতিয়ান ও মালিকানা চেইন ➔" : "📜 Survey Records & Chain ➔"}
                    </div>
                  </button>
                  <button
                    className="action-card"
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "1px solid #28445e",
                    }}
                    onClick={() => onNavigateWorkflow("documents")}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#8da2b7" }}>
                      {lang === "bn" ? "📑 দলিল বিশ্লেষণ ও তথ্য নিষ্কাশন ➔" : "📑 Deed AI Document Review ➔"}
                    </div>
                  </button>
                  <button
                    className="action-card"
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "1px solid #28445e",
                    }}
                    onClick={() => onNavigateWorkflow("journey")}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#8da2b7" }}>
                      {lang === "bn" ? "💰 রেজিস্ট্রেশন খরচ ক্যালকুলেটর ➔" : "💰 Registration Fee Calculator ➔"}
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="panel" style={{ padding: "30px", textAlign: "center", color: "#778fa5" }}>
              <MapPin size={34} style={{ margin: "auto", opacity: 0.6, marginBottom: "12px" }} />
              <p style={{ fontSize: "13px" }}>
                {lang === "bn"
                  ? "মানচিত্রে যেকোনো জেলা নির্বাচন করুন অথবা পার্সেল আইডি অনুসন্ধান করুন।"
                  : "Select any district or search a parcel ID."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
