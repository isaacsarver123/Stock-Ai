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
  Clock,
  Activity,
  X,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
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
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            data-testid="stock-search-input"
            type="text"
            placeholder="Enter ticker or company name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>
        <Button 
          data-testid="predict-button"
          type="submit" 
          disabled={isLoading || !query}
          className="bg-blue-600 hover:bg-blue-500 text-white transition-all duration-150"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Target className="h-4 w-4 mr-2" />
              Predict
            </>
          )}
        </Button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          data-testid="search-suggestions"
          className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-sm z-50 max-h-60 overflow-auto"
        >
          {suggestions.map((stock, idx) => (
            <button
              key={idx}
              data-testid={`suggestion-${stock.ticker}`}
              onClick={() => handleSelect(stock.ticker)}
              className="w-full px-4 py-2 text-left hover:bg-zinc-800 transition-colors duration-150 flex justify-between items-center border-b border-zinc-800 last:border-0"
            >
              <span className="font-mono text-white">{stock.ticker}</span>
              <span className="text-sm text-zinc-400 truncate ml-2">{stock.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Price Display Component
const PriceDisplay = ({ quote, prediction }) => {
  if (!quote) return null;
  
  const isPositive = quote.change >= 0;
  
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Current Price
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black font-mono tracking-tighter text-white">
                ${quote.price?.toFixed(2)}
              </span>
              <span className={`flex items-center text-lg font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {quote.change_percent}
              </span>
            </div>
          </div>
          
          {prediction && (
            <div className={`px-4 py-2 rounded-sm text-lg font-bold ${
              prediction.prediction === 'BUY' ? 'badge-buy' :
              prediction.prediction === 'SELL' ? 'badge-sell' : 'badge-hold'
            }`}>
              {prediction.prediction}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Open</div>
            <div className="font-mono text-white">${quote.open?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">High</div>
            <div className="font-mono text-emerald-400">${quote.high?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Low</div>
            <div className="font-mono text-red-400">${quote.low?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Volume</div>
            <div className="font-mono text-white">{(quote.volume / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Prediction Analysis Card
const PredictionCard = ({ prediction }) => {
  if (!prediction) return null;

  const getConfidenceColor = (conf) => {
    if (conf >= 70) return 'text-emerald-400';
    if (conf >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskColor = (risk) => {
    if (risk === 'LOW') return 'text-emerald-400';
    if (risk === 'MEDIUM') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${prediction.is_urgent ? 'animate-pulse-urgent border-red-500' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center justify-between">
          <span>AI Analysis</span>
          {prediction.is_urgent && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              URGENT
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-zinc-800/50 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Confidence</div>
            <div className={`text-2xl font-bold font-mono ${getConfidenceColor(prediction.confidence)}`}>
              {prediction.confidence}%
            </div>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Risk Level</div>
            <div className={`text-2xl font-bold font-mono ${getRiskColor(prediction.risk_level)}`}>
              {prediction.risk_level}
            </div>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Horizon</div>
            <div className="text-2xl font-bold font-mono text-blue-400 capitalize">
              {prediction.time_horizon}
            </div>
          </div>
        </div>

        {prediction.price_target && (
          <div className="p-3 bg-zinc-800/50 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Price Target</div>
            <div className="text-xl font-bold font-mono text-white">
              ${prediction.price_target.toFixed(2)}
            </div>
          </div>
        )}

        <div className="p-3 bg-zinc-800/50 rounded-sm">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Analysis</div>
          <p className="text-sm text-zinc-300 leading-relaxed">{prediction.analysis}</p>
        </div>

        {prediction.detected_patterns?.length > 0 && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Detected Patterns
            </div>
            <div className="flex flex-wrap gap-2">
              {prediction.detected_patterns.map((pattern, idx) => (
                <Badge key={idx} variant="outline" className="font-mono text-xs border-zinc-700 text-zinc-300">
                  {pattern.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {prediction.urgency_reason && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-red-400 mb-1">Urgency Reason</div>
            <p className="text-sm text-red-300">{prediction.urgency_reason}</p>
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

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          {ticker} Price Chart (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#71717A', fontSize: 10 }}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis 
                tick={{ fill: '#71717A', fontSize: 10 }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#A1A1AA' }}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#007AFF" 
                strokeWidth={2}
                fill="url(#colorPrice)" 
              />
            </AreaChart>
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-400" />
          Analyze Chart Image
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div
            data-testid="chart-upload-dropzone"
            className={`drop-zone rounded-sm p-8 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('chart-file-input').click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-500" />
            <p className="text-zinc-400 mb-1">Drop a chart image here</p>
            <p className="text-xs text-zinc-500">or click to browse (PNG, JPG, WEBP)</p>
            <input
              id="chart-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleDrop}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img src={preview} alt="Chart preview" className="w-full h-48 object-contain bg-zinc-800 rounded-sm" />
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 p-1 bg-zinc-900/80 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input
              data-testid="chart-ticker-input"
              placeholder="Ticker (optional)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-zinc-800 border-zinc-700"
            />
            <Button
              data-testid="analyze-chart-button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</>
              ) : (
                <><Activity className="h-4 w-4 mr-2" /> Analyze Chart</>
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Alerts
          </span>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No alerts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  data-testid={`notification-${notif.id}`}
                  className={`glass-card p-3 rounded-sm border transition-all animate-slide-in ${
                    notif.type?.includes('URGENT') 
                      ? 'border-red-500/50 animate-pulse-urgent' 
                      : notif.type?.includes('BUY')
                      ? 'border-emerald-500/50'
                      : 'border-zinc-700'
                  } ${notif.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-mono ${
                            notif.type?.includes('BUY') ? 'border-emerald-500 text-emerald-400' :
                            notif.type?.includes('SELL') ? 'border-red-500 text-red-400' : 
                            'border-zinc-500 text-zinc-400'
                          }`}
                        >
                          {notif.ticker}
                        </Badge>
                        <span className={`text-xs font-bold ${
                          notif.type?.includes('URGENT') ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {notif.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{notif.message}</p>
                      <p className="text-xs text-zinc-500 mt-1">{notif.reason}</p>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Mark read
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center gap-2">
          <History className="h-5 w-5 text-blue-400" />
          Prediction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No predictions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((pred, idx) => (
                <button
                  key={pred.id || idx}
                  data-testid={`history-item-${pred.id}`}
                  onClick={() => onSelectPrediction(pred)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-sm transition-all duration-150 text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{pred.ticker}</span>
                      <Badge 
                        className={`text-xs ${
                          pred.prediction === 'BUY' ? 'badge-buy' :
                          pred.prediction === 'SELL' ? 'badge-sell' : 'badge-hold'
                        }`}
                      >
                        {pred.prediction}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>{pred.confidence}% confidence</span>
                      <span>
                        {new Date(pred.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Candlestick Patterns Database</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-zinc-400 mb-4">
          {patterns?.total || 500}+ patterns recognized
        </div>
        <div className="space-y-2">
          {patterns?.patterns && Object.entries(patterns.patterns).slice(0, 30).map(([name, info]) => (
            <div key={name} className="p-3 bg-zinc-800/50 rounded-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-white">{name.replace(/_/g, ' ')}</span>
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
              <p className="text-xs text-zinc-400">{info.description}</p>
              <p className="text-xs text-zinc-500 mt-1">Reliability: {info.reliability}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  const [selectedHistoryPrediction, setSelectedHistoryPrediction] = useState(null);

  // Fetch patterns count on mount
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await axios.get(`${API}/patterns?limit=30`);
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
      // Fetch stock quote
      const quoteResponse = await axios.get(`${API}/stock/${ticker}`);
      setQuote(quoteResponse.data);

      // Fetch daily data for chart
      const dailyResponse = await axios.get(`${API}/stock/${ticker}/daily`);
      setDailyData(dailyResponse.data.data || []);

      // Get prediction
      const predictionResponse = await axios.post(`${API}/predict/${ticker}`);
      setPrediction(predictionResponse.data);
      
      toast.success(`Analysis complete for ${ticker}`);
      
      // Refresh history
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
    setSelectedHistoryPrediction(pred);
    setPrediction(pred);
    setCurrentTicker(pred.ticker);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Toaster 
        theme="dark" 
        position="top-right"
        toastOptions={{
          style: {
            background: '#121212',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff'
          }
        }}
      />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-black tracking-tight">
                  MarketPulse<span className="text-blue-500">AI</span>
                </h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                  Stock Prediction Engine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                data-testid="view-patterns-button"
                variant="outline"
                size="sm"
                onClick={() => setShowPatterns(true)}
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                <Activity className="h-4 w-4 mr-2" />
                {patterns?.total || 500}+ Patterns
              </Button>
              <div className="relative">
                <Bell className="h-5 w-5 text-zinc-400" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <StockSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area - spans 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Price and Prediction */}
            {currentTicker && (
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-heading text-3xl font-bold">{currentTicker}</h2>
                {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-400" />}
              </div>
            )}

            {quote && <PriceDisplay quote={quote} prediction={prediction} />}
            
            {/* Chart */}
            {dailyData.length > 0 && <PriceChart dailyData={dailyData} ticker={currentTicker} />}

            {/* Prediction Analysis */}
            {prediction && <PredictionCard prediction={prediction} />}

            {/* Empty State */}
            {!currentTicker && !prediction && (
              <Card className="bg-zinc-900 border-zinc-800 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-zinc-500" />
                  </div>
                  <h3 className="font-heading text-xl text-zinc-300 mb-2">
                    Enter a Stock Ticker
                  </h3>
                  <p className="text-zinc-500 max-w-md mx-auto">
                    Search for any stock by ticker symbol or company name to get AI-powered predictions based on 500+ candlestick patterns
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                <TabsTrigger value="upload" data-testid="tab-upload" className="data-[state=active]:bg-zinc-700">
                  <Upload className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="alerts" data-testid="tab-alerts" className="data-[state=active]:bg-zinc-700">
                  <Bell className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-zinc-700">
                  <History className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <ChartUpload onAnalyze={handleChartAnalysis} isAnalyzing={isAnalyzingChart} />
              </TabsContent>
              
              <TabsContent value="alerts" className="mt-4">
                <NotificationsPanel 
                  notifications={notifications} 
                  onMarkRead={handleMarkRead}
                  onRefresh={fetchNotifications}
                />
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <HistoryPanel 
                  history={history} 
                  onSelectPrediction={handleSelectHistoryPrediction}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Pattern Info Modal */}
      <PatternInfoModal 
        isOpen={showPatterns} 
        onClose={() => setShowPatterns(false)} 
        patterns={patterns}
      />
    </div>
  );
}

export default App;
