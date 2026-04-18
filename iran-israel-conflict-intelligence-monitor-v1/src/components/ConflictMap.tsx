import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabaseClient';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for assets
const assetIcons: Record<string, L.Icon> = {
  tank: new L.Icon({ iconUrl: '/icons/tank.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
  aircraft: new L.Icon({ iconUrl: '/icons/aircraft.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
  warship: new L.Icon({ iconUrl: '/icons/warship.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
  missile: new L.Icon({ iconUrl: '/icons/missile.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
  drone: new L.Icon({ iconUrl: '/icons/drone.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
  default: new L.Icon({ iconUrl: '/icons/default.png', iconSize: [32, 32], popupAnchor: [0, -16] }),
};

// Fallback emoji-based markers if images not available
const getAssetEmoji = (assetType: string) => {
  switch(assetType) {
    case 'tank': return '🚀';
    case 'aircraft': return '✈️';
    case 'warship': return '🚢';
    case 'missile': return '🎯';
    case 'drone': return '🛸';
    default: return '📍';
  }
};

interface MapArticle {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  published_at: string;
  url: string;
  location_lat: number;
  location_lon: number;
  is_breaking: boolean;
  asset_type?: string; // tank, aircraft, warship, missile, drone
  analysis?: string; // short AI analysis
}

const getMarkerColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    default: return 'blue';
  }
};

const ConflictMap: React.FC = () => {
  const [articles, setArticles] = useState<MapArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>({});

  // Fetch articles and then fetch analyses for each location
  const fetchMapData = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, summary, source_name, published_at, url, location_lat, location_lon, is_breaking')
      .not('location_lat', 'is', null)
      .order('published_at', { ascending: false })
      .limit(100);
    if (error) console.error('Map fetch error:', error);
    else {
      // Detect asset type from title/summary
      const withAssets = (data || []).map(article => {
        const text = (article.title + ' ' + article.summary).toLowerCase();
        let asset_type: MapArticle['asset_type'] = undefined;
        if (text.includes('tank') || text.includes('armor') || text.includes('ground force')) asset_type = 'tank';
        else if (text.includes('aircraft') || text.includes('fighter') || text.includes('jet') || text.includes('plane')) asset_type = 'aircraft';
        else if (text.includes('warship') || text.includes('navy') || text.includes('vessel') || text.includes('destroyer')) asset_type = 'warship';
        else if (text.includes('missile') || text.includes('rocket') || text.includes('ballistic')) asset_type = 'missile';
        else if (text.includes('drone') || text.includes('uav')) asset_type = 'drone';
        // severity based on keywords
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (text.includes('attack') || text.includes('strike') || text.includes('kill')) severity = 'critical';
        else if (text.includes('tension') || text.includes('threat') || text.includes('sanction')) severity = 'high';
        else if (text.includes('diplomatic') || text.includes('talk')) severity = 'medium';
        else severity = 'low';
        return { ...article, asset_type, severity };
      });
      setArticles(withAssets);
    }
    setLoading(false);
  };

  // Fetch AI analysis for a specific location (group of articles near that lat/lon)
  const fetchAnalysis = async (lat: number, lon: number, title: string) => {
    const key = `${lat},${lon}`;
    if (analysisLoading[key]) return;
    setAnalysisLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch('/api/location-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, title }),
      });
      const data = await response.json();
      if (data.analysis) {
        setArticles(prev => prev.map(a => {
          if (Math.abs(a.location_lat - lat) < 0.1 && Math.abs(a.location_lon - lon) < 0.1) {
            return { ...a, analysis: data.analysis };
          }
          return a;
        }));
      }
    } catch (err) {
      console.error('Analysis fetch failed', err);
    } finally {
      setAnalysisLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 60000); // refresh articles every minute
    const analysisInterval = setInterval(() => {
      // For each unique location, fetch analysis every 10 minutes
      const uniqueLocs = new Map();
      articles.forEach(a => {
        const key = `${a.location_lat},${a.location_lon}`;
        if (!uniqueLocs.has(key)) uniqueLocs.set(key, a);
      });
      uniqueLocs.forEach((article, key) => {
        fetchAnalysis(article.location_lat, article.location_lon, article.title);
      });
    }, 10 * 60 * 1000); // 10 minutes
    return () => {
      clearInterval(interval);
      clearInterval(analysisInterval);
    };
  }, [articles]);

  const center: [number, number] = [32.0, 53.0];
  const filteredArticles = selectedType === 'all' ? articles : articles.filter(a => a.severity === selectedType);

  if (loading) return <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>;

  return (
    <div className="space-y-4">
      {/* Legend / Filter */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => setSelectedType('all')} className={`px-3 py-1 rounded-full text-sm ${selectedType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All Events</button>
        <button onClick={() => setSelectedType('critical')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${selectedType === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}><span className="w-2 h-2 rounded-full bg-red-600"></span> Critical</button>
        <button onClick={() => setSelectedType('high')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${selectedType === 'high' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'}`}><span className="w-2 h-2 rounded-full bg-orange-500"></span> High</button>
        <button onClick={() => setSelectedType('medium')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${selectedType === 'medium' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'}`}><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Medium</button>
        <button onClick={() => setSelectedType('low')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${selectedType === 'low' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}><span className="w-2 h-2 rounded-full bg-blue-500"></span> Low</button>
      </div>

      <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-lg border border-gray-200">
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredArticles.map((article) => {
            const icon = article.asset_type && assetIcons[article.asset_type] ? assetIcons[article.asset_type] : undefined;
            const emoji = article.asset_type ? getAssetEmoji(article.asset_type) : '📍';
            const color = getMarkerColor(article.severity);
            return (
              <Marker
                key={article.id}
                position={[article.location_lat, article.location_lon]}
                icon={icon}
              >
                <Tooltip sticky>{article.title.substring(0, 60)}</Tooltip>
                <Popup>
                  <div className="max-w-xs">
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-1">{emoji} {article.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">{article.summary?.substring(0, 120)}...</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{article.source_name}</span>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Read</a>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(article.published_at).toLocaleString()}</div>
                    {article.analysis && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <strong>AI Analysis:</strong> {article.analysis}
                      </div>
                    )}
                    {analysisLoading[`${article.location_lat},${article.location_lon}`] && (
                      <div className="mt-2 text-xs text-gray-400">Loading analysis...</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-xs text-gray-400 text-center">Icons: 🚀 Tank/armor, ✈️ Aircraft, 🚢 Warship, 🎯 Missile, 🛸 Drone. Colors: 🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low</p>
    </div>
  );
};

export default ConflictMap;
