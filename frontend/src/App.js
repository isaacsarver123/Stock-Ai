import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Upload, 
  Bell, 
  History, 
  BarChart3,
  Target,
  Activity,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  Zap,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stock Search Component
const StockSearch = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchStocks = useCallback(async (searchQuery) => {
    if (searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/search?query=${searchQuery}`);
      setSuggestions(response.data.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search error:", error);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query) searchStocks(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchStocks]);

  const handleSelect = (ticker) => {
    setQuery(ticker);
    setShowSuggestions(false);
    onSearch(ticker);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query) {
      setShowSuggestions(false);
      onSearch(query.toUpperCase());
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            data-testid="stock-search-input"
            type="text"
            placeholder="Search ticker or company (e.g. AAPL, Tesla)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-12 h-14 text-lg bg-zinc-900/80 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
          />
        </div>
        <Button 
          data-testid="predict-button"
          type="submit" 
          disabled={isLoading || !query}
          className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white transition-all duration-150 rounded-lg shadow-lg shadow-blue-500/20"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          data-testid="search-suggestions"
          className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg z-50 max-h-72 overflow-auto shadow-xl shadow-black/50"
        >
          {suggestions.map((stock, idx) => (
            <button
              key={idx}
              data-testid={`suggestion-${stock.ticker}`}
              onClick={() => handleSelect(stock.ticker)}
              className="w-full px-5 py-3 text-left hover:bg-zinc-800 transition-colors duration-150 flex justify-between items-center border-b border-zinc-800 last:border-0"
            >
              <span className="font-mono text-lg font-semibold text-white">{stock.ticker}</span>
              <span className="text-sm text-zinc-400 truncate ml-4">{stock.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Stock Info Header
const StockInfoHeader = ({ quote, prediction }) => {
  if (!quote) return null;
  
  const isPositive = quote.change >= 0;
  
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black font-heading tracking-tight text-white">{quote.ticker}</h2>
              {prediction && (
                <Badge 
                  data-testid="prediction-badge"
                  className={`text-sm font-bold px-3 py-1 ${
                    prediction.prediction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                    prediction.prediction === 'SELL' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  }`}
                >
                  {prediction.prediction}
                </Badge>
              )}
            </div>
            <p className="text-zinc-400">{quote.name}</p>
          </div>
        </div>
        
        <div className="flex items-baseline gap-4">
          <span className="text-5xl lg:text-6xl font-black font-mono tracking-tighter text-white">
            ${quote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center text-xl font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
            <span>{quote.change_percent}</span>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-zinc-800">
        <StatItem label="Open" value={`$${quote.open?.toFixed(2)}`} />
        <StatItem label="High" value={`$${quote.high?.toFixed(2)}`} color="text-emerald-400" />
        <StatItem label="Low" value={`$${quote.low?.toFixed(2)}`} color="text-red-400" />
        <StatItem label="Prev Close" value={`$${quote.previous_close?.toFixed(2)}`} />
        <StatItem label="Volume" value={formatVolume(quote.volume)} />
        {quote.market_cap && <StatItem label="Market Cap" value={formatMarketCap(quote.market_cap)} />}
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color = "text-white" }) => (
  <div className="bg-zinc-800/30 rounded-lg p-3">
    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
    <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
  </div>
);

const formatVolume = (vol) => {
  if (!vol) return '-';
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
};

const formatMarketCap = (cap) => {
  if (!cap) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap}`;
};

// AI Analysis Panel
const AIAnalysisPanel = ({ prediction }) => {
  if (!prediction) return null;

  const getConfidenceColor = (conf) => {
    if (conf >= 70) return 'from-emerald-500 to-emerald-400';
    if (conf >= 50) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  const getRiskBadge = (risk) => {
    if (risk === 'LOW') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    if (risk === 'MEDIUM') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-red-500/20 text-red-400 border-red-500/50';
  };

  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${prediction.is_urgent ? 'ring-2 ring-red-500/50 animate-pulse-urgent' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            AI Analysis
          </CardTitle>
          {prediction.is_urgent && (
            <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">
              <AlertTriangle className="h-4 w-4 mr-1" />
              URGENT SIGNAL
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-zinc-800/50 rounded-xl p-4 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getConfidenceColor(prediction.confidence)}`} 
                   style={{ height: `${prediction.confidence}%` }} />
            </div>
            <div className="relative">
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Confidence</div>
              <div className="text-4xl font-black font-mono text-white">{prediction.confidence}%</div>
            </div>
          </div>
          
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Risk Level</div>
            <Badge className={`text-lg font-bold px-3 py-1.5 ${getRiskBadge(prediction.risk_level)}`}>
              {prediction.risk_level}
            </Badge>
          </div>
          
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Time Horizon</div>
            <div className="text-2xl font-bold text-blue-400 capitalize">{prediction.time_horizon}</div>
          </div>
        </div>

        {prediction.price_target && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-400" />
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Price Target</div>
                <div className="text-3xl font-black font-mono text-white">${prediction.price_target.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Text */}
        <div className="bg-zinc-800/30 rounded-xl p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Analysis Summary</div>
          <p className="text-base text-zinc-300 leading-relaxed">{prediction.analysis}</p>
        </div>

        {/* Detected Patterns */}
        {prediction.detected_patterns?.length > 0 && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
              Detected Candlestick Patterns
            </div>
            <div className="flex flex-wrap gap-2">
              {prediction.detected_patterns.map((pattern, idx) => (
                <Badge key={idx} variant="outline" className="font-mono text-sm border-zinc-600 text-zinc-300 px-3 py-1.5">
                  {pattern.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {prediction.urgency_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-red-400 mb-1">Urgency Alert</div>
                <p className="text-sm text-red-300">{prediction.urgency_reason}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Price Chart Component
const PriceChart = ({ dailyData, ticker }) => {
  if (!dailyData || dailyData.length === 0) return null;

  const chartData = [...dailyData].reverse().slice(-30);
  const minPrice = Math.min(...chartData.map(d => d.low)) * 0.995;
  const maxPrice = Math.max(...chartData.map(d => d.high)) * 1.005;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Price History (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#71717A', fontSize: 11 }}
                tickFormatter={(val) => val.slice(5)}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis 
                tick={{ fill: '#71717A', fontSize: 11 }}
                domain={[minPrice, maxPrice]}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                width={60}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}
                labelStyle={{ color: '#A1A1AA', marginBottom: '4px' }}
                formatter={(value, name) => [`$${value.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Bar dataKey="volume" fill="rgba(255,255,255,0.05)" yAxisId="volume" />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#007AFF" 
                strokeWidth={2}
                fill="url(#colorPrice)" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Chart Upload Component
const ChartUpload = ({ onAnalyze, isAnalyzing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [ticker, setTicker] = useState("");

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!preview) return;
    const base64 = preview.split(',')[1];
    await onAnalyze(base64, ticker || null);
  };

  const clearPreview = () => {
    setPreview(null);
    setTicker("");
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-400" />
          Chart Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div
            data-testid="chart-upload-dropzone"
            className={`drop-zone rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'drag-over border-blue-500 bg-blue-500/5' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('chart-file-input').click()}
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Upload className="h-7 w-7 text-zinc-400" />
            </div>
            <p className="text-zinc-300 font-medium mb-1">Drop chart image here</p>
            <p className="text-xs text-zinc-500">PNG, JPG, WEBP supported</p>
            <input
              id="chart-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleDrop}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden">
              <img src={preview} alt="Chart preview" className="w-full h-32 object-contain bg-zinc-800" />
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 p-1.5 bg-zinc-900/90 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input
              data-testid="chart-ticker-input"
              placeholder="Ticker (optional)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-zinc-800 border-zinc-700 h-10"
            />
            <Button
              data-testid="analyze-chart-button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-blue-600 hover:bg-blue-500 h-10"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</>
              ) : (
                <><Activity className="h-4 w-4 mr-2" /> Analyze</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Notifications Panel
const NotificationsPanel = ({ notifications, onMarkRead, onRefresh }) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Alerts
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2">
                {notifications.filter(n => !n.is_read).length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 px-4 pb-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  data-testid={`notification-${notif.id}`}
                  className={`p-3 rounded-lg border transition-all ${
                    notif.type?.includes('URGENT') 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : notif.type?.includes('BUY')
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-zinc-800/50 border-zinc-700'
                  } ${notif.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-white">{notif.ticker}</span>
                        <span className={`text-xs font-bold ${
                          notif.type?.includes('URGENT') ? 'text-red-400' : 
                          notif.type?.includes('BUY') ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {notif.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{notif.message}</p>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// History Panel
const HistoryPanel = ({ history, onSelectPrediction }) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-blue-400" />
          History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 px-4 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No predictions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((pred, idx) => (
                <button
                  key={pred.id || idx}
                  data-testid={`history-item-${pred.id}`}
                  onClick={() => onSelectPrediction(pred)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all duration-150 text-left flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white">{pred.ticker}</span>
                      <Badge 
                        className={`text-xs ${
                          pred.prediction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                          pred.prediction === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {pred.prediction}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {pred.confidence}% • {new Date(pred.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Pattern Info Modal
const PatternInfoModal = ({ isOpen, onClose, patterns }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Candlestick Patterns Database</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {patterns?.total || 500}+ patterns recognized by the AI analysis engine
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="grid gap-3">
            {patterns?.patterns && Object.entries(patterns.patterns).slice(0, 50).map(([name, info]) => (
              <div key={name} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold text-white">{name.replace(/_/g, ' ')}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      info.type?.includes('bullish') ? 'border-emerald-500 text-emerald-400' :
                      info.type?.includes('bearish') ? 'border-red-500 text-red-400' : 
                      'border-zinc-500 text-zinc-400'
                    }`}
                  >
                    {info.type}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">{info.description}</p>
                <p className="text-xs text-zinc-500 mt-2">Reliability: {info.reliability}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
      <TrendingUp className="h-12 w-12 text-blue-400" />
    </div>
    <h2 className="font-heading text-3xl font-bold text-white mb-3">
      Start Your Analysis
    </h2>
    <p className="text-zinc-400 max-w-md text-lg">
      Search for any stock by ticker or company name to get AI-powered predictions based on {'>'}2900 candlestick patterns
    </p>
    <div className="flex gap-2 mt-6">
      {['AAPL', 'TSLA', 'NVDA', 'MSFT'].map(ticker => (
        <Badge key={ticker} variant="outline" className="text-sm border-zinc-700 text-zinc-400 px-3 py-1">
          {ticker}
        </Badge>
      ))}
    </div>
  </div>
);

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);
  const [currentTicker, setCurrentTicker] = useState(null);
  const [quote, setQuote] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [showPatterns, setShowPatterns] = useState(false);

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await axios.get(`${API}/patterns?limit=50`);
        setPatterns(response.data);
      } catch (error) {
        console.error("Error fetching patterns:", error);
      }
    };
    fetchPatterns();
    fetchNotifications();
    fetchHistory();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/history?limit=20`);
      setHistory(response.data.predictions || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleSearch = async (ticker) => {
    setIsLoading(true);
    setCurrentTicker(ticker);
    setPrediction(null);
    setQuote(null);
    setDailyData([]);

    try {
      const quoteResponse = await axios.get(`${API}/stock/${ticker}`);
      setQuote(quoteResponse.data);

      const dailyResponse = await axios.get(`${API}/stock/${ticker}/daily`);
      setDailyData(dailyResponse.data.data || []);

      const predictionResponse = await axios.post(`${API}/predict/${ticker}`);
      setPrediction(predictionResponse.data);
      
      toast.success(`Analysis complete for ${ticker}`, {
        description: `Recommendation: ${predictionResponse.data.prediction}`
      });
      
      fetchHistory();
      fetchNotifications();
    } catch (error) {
      console.error("Error:", error);
      const errorMsg = error.response?.data?.detail || "Failed to analyze stock";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChartAnalysis = async (base64, ticker) => {
    setIsAnalyzingChart(true);
    try {
      const response = await axios.post(`${API}/analyze-chart`, {
        image_base64: base64,
        ticker: ticker
      });
      setPrediction(response.data);
      setCurrentTicker(ticker || "CHART");
      setQuote(null);
      setDailyData([]);
      toast.success("Chart analysis complete!");
      fetchHistory();
    } catch (error) {
      console.error("Chart analysis error:", error);
      toast.error("Failed to analyze chart image");
    } finally {
      setIsAnalyzingChart(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification:", error);
    }
  };

  const handleSelectHistoryPrediction = (pred) => {
    setPrediction(pred);
    setCurrentTicker(pred.ticker);
    // Fetch fresh data for this ticker
    handleSearch(pred.ticker);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Toaster 
          theme="dark" 
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '12px'
            }
          }}
        />

        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-black tracking-tight">
                    MarketPulse<span className="text-blue-400">AI</span>
                  </h1>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                    Real-Time Stock Predictions • Yahoo Finance
                  </p>
                </div>
              </div>

              <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
                <StockSearch onSearch={handleSearch} isLoading={isLoading} />
              </div>

              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="view-patterns-button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPatterns(true)}
                      className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 hidden sm:flex"
                    >
                      <PieChart className="h-4 w-4 mr-2" />
                      {patterns?.total || 2975}+ Patterns
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View all candlestick patterns</TooltipContent>
                </Tooltip>
                
                <div className="relative">
                  <Button variant="ghost" size="sm" className="relative" onClick={fetchNotifications}>
                    <Bell className="h-5 w-5 text-zinc-400" />
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                        {notifications.filter(n => !n.is_read).length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="lg:hidden mt-4">
              <StockSearch onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1800px] mx-auto px-6 py-8">
          {currentTicker ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Main Content - 3 columns on XL */}
              <div className="xl:col-span-3 space-y-6">
                {quote && <StockInfoHeader quote={quote} prediction={prediction} />}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dailyData.length > 0 && <PriceChart dailyData={dailyData} ticker={currentTicker} />}
                  {prediction && <AIAnalysisPanel prediction={prediction} />}
                </div>
                
                {!quote && prediction && <AIAnalysisPanel prediction={prediction} />}
              </div>

              {/* Sidebar - 1 column on XL */}
              <div className="space-y-6">
                <ChartUpload onAnalyze={handleChartAnalysis} isAnalyzing={isAnalyzingChart} />
                <NotificationsPanel 
                  notifications={notifications} 
                  onMarkRead={handleMarkRead}
                  onRefresh={fetchNotifications}
                />
                <HistoryPanel 
                  history={history} 
                  onSelectPrediction={handleSelectHistoryPrediction}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3">
                <EmptyState />
              </div>
              <div className="space-y-6">
                <ChartUpload onAnalyze={handleChartAnalysis} isAnalyzing={isAnalyzingChart} />
                <NotificationsPanel 
                  notifications={notifications} 
                  onMarkRead={handleMarkRead}
                  onRefresh={fetchNotifications}
                />
                <HistoryPanel 
                  history={history} 
                  onSelectPrediction={handleSelectHistoryPrediction}
                />
              </div>
            </div>
          )}
        </main>

        {/* Pattern Info Modal */}
        <PatternInfoModal 
          isOpen={showPatterns} 
          onClose={() => setShowPatterns(false)} 
          patterns={patterns}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
