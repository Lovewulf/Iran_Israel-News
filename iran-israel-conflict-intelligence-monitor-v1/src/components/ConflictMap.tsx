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
  severity: 'critical' | 'high' | 'medium' | 'low';
  short_analysis?: string;
}

// Helper to get icon based on keywords
function getCustomIcon(title: string, summary: string): L.DivIcon {
  const text = (title + ' ' + summary).toLowerCase();
  let iconHtml = '📍'; // default
  let bgColor = '#3b82f6'; // blue default

  if (text.includes('tank') || text.includes('armor') || text.includes('ground')) {
    iconHtml = '🚜'; // tank emoji
    bgColor = '#ef4444'; // red
  } else if (text.includes('plane') || text.includes('jet') || text.includes('air strike') || text.includes('bomb')) {
    iconHtml = '✈️';
    bgColor = '#ef4444';
  } else if (text.includes('ship') || text.includes('navy') || text.includes('vessel') || text.includes('carrier')) {
    iconHtml = '🚢';
    bgColor = '#3b82f6';
  } else if (text.includes('missile') || text.includes('rocket') || text.includes('launch')) {
    iconHtml = '🚀';
    bgColor = '#ef4444';
  } else if (text.includes('diplomatic') || text.includes('talk') || text.includes('meeting') || text.includes('negotiation')) {
    iconHtml = '🤝';
    bgColor = '#10b981'; // green
  } else if (text.includes('attack') || text.includes('strike') || text.includes('kill')) {
    iconHtml = '⚔️';
    bgColor = '#ef4444';
  }

  return L.divIcon({
    html: `<div style="background-color: ${bgColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconHtml}</div>`,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    popupAnchor: [0, -16],
  });
}

const ConflictMap: React.FC = () => {
  const [articles, setArticles] = useState<MapArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, summary, source_name, published_at, url, location_lat, location_lon, is_breaking, short_analysis')
        .not('location_lat', 'is', null)
        .order('published_at', { ascending: false })
        .limit(200);
      if (error) console.error('Map fetch error:', error);
      else {
        const withSeverity = (data || []).map(article => {
          const text = (article.title + ' ' + (article.summary || '')).toLowerCase();
          let severity: MapArticle['severity'] = 'low';
          if (text.includes('attack') || text.includes('strike') || text.includes('missile') || text.includes('kill')) severity = 'critical';
          else if (text.includes('tension') || text.includes('threat') || text.includes('sanction')) severity = 'high';
          else if (text.includes('diplomatic') || text.includes('talk') || text.includes('meeting')) severity = 'medium';
          else severity = 'low';
          return { ...article, severity, short_analysis: article.short_analysis || undefined };
        });
        setArticles(withSeverity);
      }
      setLoading(false);
    };
    fetchMapData();
    const interval = setInterval(fetchMapData, 600000); // refresh every 10 minutes
    return () => clearInterval(interval);
  }, []);

  const handleGenerateAnalysis = async (articleId: string, title: string, summary: string) => {
    setLoadingAnalysis(articleId);
    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, title, summary }),
      });
      const data = await response.json();
      if (data.analysis) {
        // Update local state to show analysis immediately
        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, short_analysis: data.analysis } : a));
      } else {
        alert('Failed to generate analysis.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating analysis.');
    } finally {
      setLoadingAnalysis(null);
    }
  };

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
          {filteredArticles.map((article) => (
            <Marker
              key={article.id}
              position={[article.location_lat, article.location_lon]}
              icon={getCustomIcon(article.title, article.summary || '')}
            >
              <Tooltip sticky>{article.title.substring(0, 60)}</Tooltip>
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-sm mb-1">{article.title}</h3>
                  <p className="text-xs text-gray-600 mb-2">{article.summary?.substring(0, 120)}...</p>
                  {article.short_analysis ? (
                    <p className="text-xs text-indigo-600 bg-indigo-50 p-1 rounded mt-1">🔍 {article.short_analysis}</p>
                  ) : (
                    <button
                      onClick={() => handleGenerateAnalysis(article.id, article.title, article.summary || '')}
                      disabled={loadingAnalysis === article.id}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition disabled:opacity-50"
                    >
                      {loadingAnalysis === article.id ? 'Generating...' : '🤖 Analyze with AI'}
                    </button>
                  )}
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-gray-500">{article.source_name}</span>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Read</a>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(article.published_at).toLocaleString()}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-gray-400 text-center">Icons: 🚜 Tank, ✈️ Air, 🚢 Naval, 🚀 Missile, 🤝 Diplomatic, ⚔️ Attack. Click marker for AI tactical analysis.</p>
    </div>
  );
};

export default ConflictMap;
