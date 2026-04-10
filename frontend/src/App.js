import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Search, TrendingUp, TrendingDown, AlertTriangle, Upload, Bell, History, BarChart3,
  Target, Activity, X, ChevronRight, Loader2, RefreshCw, Zap, PieChart, ArrowUpRight,
  ArrowDownRight, Settings, Mail, MessageSquare, Phone, Clock, PlayCircle, CheckCircle,
  XCircle, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stock Search Component
const StockSearch = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchStocks = useCallback(async (searchQuery) => {
    if (searchQuery.length < 1) { setSuggestions([]); return; }
    try {
      const response = await axios.get(`${API}/search?query=${searchQuery}`);
      setSuggestions(response.data.results || []);
      setShowSuggestions(true);
    } catch (error) { console.error("Search error:", error); }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => { if (query) searchStocks(query); }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchStocks]);

  const handleSelect = (ticker) => { setQuery(ticker); setShowSuggestions(false); onSearch(ticker); };
  const handleSubmit = (e) => { e.preventDefault(); if (query) { setShowSuggestions(false); onSearch(query.toUpperCase()); } };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input data-testid="stock-search-input" type="text" placeholder="Search ticker (e.g. AAPL, TSLA)..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-12 h-14 text-lg bg-zinc-900/80 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 rounded-lg" />
        </div>
        <Button data-testid="predict-button" type="submit" disabled={isLoading || !query}
          className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-blue-500/20">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5 mr-2" />Analyze</>}
        </Button>
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <div data-testid="search-suggestions" className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg z-50 max-h-72 overflow-auto shadow-xl">
          {suggestions.map((stock, idx) => (
            <button key={idx} data-testid={`suggestion-${stock.ticker}`} onClick={() => handleSelect(stock.ticker)}
              className="w-full px-5 py-3 text-left hover:bg-zinc-800 transition-colors flex justify-between items-center border-b border-zinc-800 last:border-0">
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
                <Badge data-testid="prediction-badge" className={`text-sm font-bold px-3 py-1 ${
                  prediction.prediction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                  prediction.prediction === 'SELL' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
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
  return vol.toLocaleString();
};

const formatMarketCap = (cap) => {
  if (!cap) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  return `$${(cap / 1e6).toFixed(2)}M`;
};

// AI Analysis Panel
const AIAnalysisPanel = ({ prediction }) => {
  if (!prediction) return null;
  const getConfidenceColor = (conf) => conf >= 70 ? 'from-emerald-500 to-emerald-400' : conf >= 50 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';
  const getRiskBadge = (risk) => risk === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' : risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';

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
              <AlertTriangle className="h-4 w-4 mr-1" />URGENT
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-zinc-800/50 rounded-xl p-4 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getConfidenceColor(prediction.confidence)}`} style={{ height: `${prediction.confidence}%` }} />
            </div>
            <div className="relative">
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Confidence</div>
              <div className="text-4xl font-black font-mono text-white">{prediction.confidence}%</div>
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Risk Level</div>
            <Badge className={`text-lg font-bold px-3 py-1.5 ${getRiskBadge(prediction.risk_level)}`}>{prediction.risk_level}</Badge>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Expected Move</div>
            <div className={`text-2xl font-bold ${(prediction.expected_move_percent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {prediction.expected_move_percent ? `${prediction.expected_move_percent > 0 ? '+' : ''}${prediction.expected_move_percent.toFixed(1)}%` : 'N/A'}
            </div>
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
        <div className="bg-zinc-800/30 rounded-xl p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Analysis</div>
          <p className="text-base text-zinc-300 leading-relaxed">{prediction.analysis}</p>
        </div>
        {prediction.detected_patterns?.length > 0 && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Detected Patterns</div>
            <div className="flex flex-wrap gap-2">
              {prediction.detected_patterns.map((pattern, idx) => (
                <Badge key={idx} variant="outline" className="font-mono text-sm border-zinc-600 text-zinc-300 px-3 py-1.5">
                  {pattern.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Price Chart
const PriceChart = ({ dailyData, ticker }) => {
  if (!dailyData || dailyData.length === 0) return null;
  const chartData = [...dailyData].reverse().slice(-30);
  const minPrice = Math.min(...chartData.map(d => d.low)) * 0.995;
  const maxPrice = Math.max(...chartData.map(d => d.high)) * 1.005;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-xl flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-blue-400" />Price History (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.4}/><stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(val) => val.slice(5)} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} domain={[minPrice, maxPrice]} tickFormatter={(val) => `$${val.toFixed(0)}`} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} width={60} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Bar dataKey="volume" fill="rgba(255,255,255,0.05)" yAxisId="volume" />
              <Area type="monotone" dataKey="close" stroke="#007AFF" strokeWidth={2} fill="url(#colorPrice)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Settings Modal
const SettingsModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchMarketStatus();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const response = await axios.get(`${API}/market-status`);
      setMarketStatus(response.data);
    } catch (error) {
      console.error("Error fetching market status:", error);
    }
  };

  const updateSettings = async (updates) => {
    setLoading(true);
    try {
      await axios.put(`${API}/settings`, updates);
      toast.success("Settings updated");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const testDiscord = async () => {
    try {
      const response = await axios.post(`${API}/settings/test-discord`);
      if (response.data.success) toast.success("Discord test sent!");
      else toast.error("Discord test failed");
    } catch (error) {
      toast.error("Discord webhook not configured or invalid");
    }
  };

  const testEmail = async () => {
    try {
      const response = await axios.post(`${API}/settings/test-email`);
      if (response.data.success) toast.success("Test email sent!");
      else toast.error("Email test failed");
    } catch (error) {
      toast.error("Email not configured");
    }
  };

  const triggerNewsScan = async () => {
    try {
      await axios.post(`${API}/scan/news`);
      toast.success("News scan started!");
    } catch (error) {
      toast.error("Failed to start scan");
    }
  };

  const triggerPatternScan = async () => {
    try {
      await axios.post(`${API}/scan/patterns`);
      toast.success("Pattern scan started!");
    } catch (error) {
      toast.error("Failed to start scan");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl flex items-center gap-3">
            <Settings className="h-6 w-6" /> Settings
          </DialogTitle>
          <DialogDescription>Configure notifications and automated scans</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Market Status */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {marketStatus?.is_open ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-zinc-500" />}
                <div>
                  <div className="font-semibold text-white">Market {marketStatus?.is_open ? 'Open' : 'Closed'}</div>
                  <div className="text-xs text-zinc-400">{marketStatus?.current_time_est} EST</div>
                </div>
              </div>
              <Badge className={marketStatus?.is_open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}>
                {marketStatus?.day_of_week}
              </Badge>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Discord Settings */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" /> Discord Webhook
            </Label>
            <p className="text-sm text-zinc-400">Receive alerts in your Discord channel (mildly urgent + critical)</p>
            <div className="flex gap-2">
              <Input
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discord_webhook_url || ''}
                onChange={(e) => setSettings({...settings, discord_webhook_url: e.target.value})}
                className="bg-zinc-800 border-zinc-700"
              />
              <Button variant="outline" size="sm" onClick={testDiscord} className="shrink-0">Test</Button>
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" /> Email Notifications
            </Label>
            <p className="text-sm text-zinc-400">Receive regular updates and critical alerts via email</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="your@email.com" value={settings.email_recipient || ''}
                onChange={(e) => setSettings({...settings, email_recipient: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Resend API Key (re_...)" type="password"
                value={settings.resend_api_key === '***configured***' ? '' : (settings.resend_api_key || '')}
                onChange={(e) => setSettings({...settings, resend_api_key: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
            </div>
            <Button variant="outline" size="sm" onClick={testEmail}>Test Email</Button>
          </div>

          {/* SMS Settings */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-400" /> SMS (Critical Only)
            </Label>
            <p className="text-sm text-zinc-400">Receive SMS for 30%+ potential moves only</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Twilio Account SID" value={settings.twilio_account_sid || ''}
                onChange={(e) => setSettings({...settings, twilio_account_sid: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="Twilio Auth Token" type="password"
                value={settings.twilio_auth_token === '***configured***' ? '' : (settings.twilio_auth_token || '')}
                onChange={(e) => setSettings({...settings, twilio_auth_token: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="From Phone (+1...)" value={settings.twilio_phone_from || ''}
                onChange={(e) => setSettings({...settings, twilio_phone_from: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
              <Input placeholder="To Phone (+1...)" value={settings.twilio_phone_to || ''}
                onChange={(e) => setSettings({...settings, twilio_phone_to: e.target.value})}
                className="bg-zinc-800 border-zinc-700" />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-lg font-semibold">Enable Notifications</Label>
              <p className="text-sm text-zinc-400">Turn all notifications on/off</p>
            </div>
            <Switch checked={settings.notifications_enabled !== false}
              onCheckedChange={(checked) => setSettings({...settings, notifications_enabled: checked})} />
          </div>

          <Button onClick={() => updateSettings(settings)} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>

          <Separator className="bg-zinc-800" />

          {/* Manual Scans */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" /> Manual Scans
            </Label>
            <p className="text-sm text-zinc-400">
              Automated scans run during market hours only (9:30 AM - 4:00 PM EST, Mon-Fri)
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={triggerNewsScan} className="flex-1">
                <PlayCircle className="h-4 w-4 mr-2" /> Run News Scan
              </Button>
              <Button variant="outline" onClick={triggerPatternScan} className="flex-1">
                <PlayCircle className="h-4 w-4 mr-2" /> Run Pattern Scan
              </Button>
            </div>
          </div>

          {/* Last Scan Info */}
          {(settings.last_news_scan || settings.last_pattern_scan) && (
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2">
              {settings.last_news_scan && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Last News Scan:</span>
                  <span className="text-zinc-300">{new Date(settings.last_news_scan).toLocaleString()}</span>
                </div>
              )}
              {settings.last_pattern_scan && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Last Pattern Scan:</span>
                  <span className="text-zinc-300">{new Date(settings.last_pattern_scan).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Notifications Panel
const NotificationsPanel = ({ notifications, onMarkRead, onRefresh }) => {
  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'bg-red-500/20 border-red-500/50 animate-pulse-urgent';
    if (severity === 'high') return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-zinc-800/50 border-zinc-700';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" /> Alerts
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2">{notifications.filter(n => !n.is_read).length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 px-4 pb-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-zinc-500"><Bell className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No alerts</p></div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, idx) => (
                <div key={notif.id || idx} data-testid={`notification-${notif.id}`}
                  className={`p-3 rounded-lg border transition-all ${getSeverityColor(notif.severity)} ${notif.is_read ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-white">{notif.ticker}</span>
                        <Badge className={`text-xs ${notif.type?.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : notif.type?.includes('SELL') ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700'}`}>
                          {notif.type?.replace('_', ' ')}
                        </Badge>
                        {notif.expected_move && (
                          <span className={`text-xs font-mono ${notif.expected_move > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {notif.expected_move > 0 ? '+' : ''}{notif.expected_move.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500">{notif.source}</span>
                        {notif.sent_discord && <MessageSquare className="h-3 w-3 text-indigo-400" />}
                        {notif.sent_email && <Mail className="h-3 w-3 text-blue-400" />}
                        {notif.sent_sms && <Phone className="h-3 w-3 text-emerald-400" />}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <button onClick={() => onMarkRead(notif.id)} className="text-xs text-blue-400 hover:text-blue-300 shrink-0">✓</button>
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
const HistoryPanel = ({ history, onSelectPrediction }) => (
  <Card className="bg-zinc-900 border-zinc-800 h-full">
    <CardHeader className="pb-3">
      <CardTitle className="font-heading text-lg flex items-center gap-2"><History className="h-5 w-5 text-blue-400" />History</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <ScrollArea className="h-64 px-4 pb-4">
        {history.length === 0 ? (
          <div className="text-center py-8 text-zinc-500"><History className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No predictions yet</p></div>
        ) : (
          <div className="space-y-2">
            {history.map((pred, idx) => (
              <button key={pred.id || idx} data-testid={`history-item-${pred.id}`} onClick={() => onSelectPrediction(pred)}
                className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left flex items-center justify-between group">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white">{pred.ticker}</span>
                    <Badge className={`text-xs ${pred.prediction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : pred.prediction === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {pred.prediction}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{pred.confidence}% • {new Date(pred.timestamp).toLocaleDateString()}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white shrink-0" />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </CardContent>
  </Card>
);

// Chart Upload
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
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!preview) return;
    await onAnalyze(preview.split(',')[1], ticker || null);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader className="pb-3"><CardTitle className="font-heading text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-blue-400" />Chart Analysis</CardTitle></CardHeader>
      <CardContent>
        {!preview ? (
          <div data-testid="chart-upload-dropzone" className={`drop-zone rounded-xl p-6 text-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-500/5' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
            onClick={() => document.getElementById('chart-file-input').click()}>
            <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-500" />
            <p className="text-zinc-300 mb-1">Drop chart here</p>
            <p className="text-xs text-zinc-500">PNG, JPG, WEBP</p>
            <input id="chart-file-input" type="file" accept="image/*" className="hidden" onChange={handleDrop} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden">
              <img src={preview} alt="Chart" className="w-full h-32 object-contain bg-zinc-800" />
              <button onClick={() => { setPreview(null); setTicker(""); }} className="absolute top-2 right-2 p-1.5 bg-zinc-900/90 rounded-full hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <Input data-testid="chart-ticker-input" placeholder="Ticker (optional)" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="bg-zinc-800 border-zinc-700 h-10" />
            <Button data-testid="analyze-chart-button" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-blue-600 hover:bg-blue-500 h-10">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing...</> : <><Activity className="h-4 w-4 mr-2" />Analyze</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
      <TrendingUp className="h-12 w-12 text-blue-400" />
    </div>
    <h2 className="font-heading text-3xl font-bold text-white mb-3">Start Your Analysis</h2>
    <p className="text-zinc-400 max-w-md text-lg">AI-powered predictions with automated news & pattern scanning during market hours</p>
    <div className="flex gap-2 mt-6">
      {['AAPL', 'TSLA', 'NVDA', 'MSFT'].map(ticker => (
        <Badge key={ticker} variant="outline" className="text-sm border-zinc-700 text-zinc-400 px-3 py-1">{ticker}</Badge>
      ))}
    </div>
  </div>
);

// Main App
function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);
  const [currentTicker, setCurrentTicker] = useState(null);
  const [quote, setQuote] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchHistory();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.notifications || []);
    } catch (error) { console.error("Error:", error); }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/history?limit=20`);
      setHistory(response.data.predictions || []);
    } catch (error) { console.error("Error:", error); }
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
      toast.success(`Analysis complete for ${ticker}`, { description: `Recommendation: ${predictionResponse.data.prediction}` });
      fetchHistory();
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to analyze");
    } finally { setIsLoading(false); }
  };

  const handleChartAnalysis = async (base64, ticker) => {
    setIsAnalyzingChart(true);
    try {
      const response = await axios.post(`${API}/analyze-chart`, { image_base64: base64, ticker });
      setPrediction(response.data);
      setCurrentTicker(ticker || "CHART");
      setQuote(null);
      setDailyData([]);
      toast.success("Chart analysis complete!");
      fetchHistory();
    } catch (error) { toast.error("Failed to analyze chart"); }
    finally { setIsAnalyzingChart(false); }
  };

  const handleMarkRead = async (id) => {
    try { await axios.post(`${API}/notifications/${id}/read`); fetchNotifications(); }
    catch (error) { console.error("Error:", error); }
  };

  const handleSelectHistoryPrediction = (pred) => {
    setPrediction(pred);
    setCurrentTicker(pred.ticker);
    handleSearch(pred.ticker);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' } }} />

        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-black tracking-tight">MarketPulse<span className="text-blue-400">AI</span></h1>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Auto-Scanning • Real-Time Alerts</p>
                </div>
              </div>
              <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
                <StockSearch onSearch={handleSearch} isLoading={isLoading} />
              </div>
              <div className="flex items-center gap-3">
                <Tooltip><TooltipTrigger asChild>
                  <Button data-testid="settings-button" variant="outline" size="sm" onClick={() => setShowSettings(true)} className="border-zinc-700 hover:bg-zinc-800">
                    <Settings className="h-4 w-4 mr-2" />Settings
                  </Button>
                </TooltipTrigger><TooltipContent>Configure notifications & scans</TooltipContent></Tooltip>
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
            <div className="lg:hidden mt-4"><StockSearch onSearch={handleSearch} isLoading={isLoading} /></div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-[1800px] mx-auto px-6 py-8">
          {currentTicker ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 space-y-6">
                {quote && <StockInfoHeader quote={quote} prediction={prediction} />}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dailyData.length > 0 && <PriceChart dailyData={dailyData} ticker={currentTicker} />}
                  {prediction && <AIAnalysisPanel prediction={prediction} />}
                </div>
                {!quote && prediction && <AIAnalysisPanel prediction={prediction} />}
              </div>
              <div className="space-y-6">
                <ChartUpload onAnalyze={handleChartAnalysis} isAnalyzing={isAnalyzingChart} />
                <NotificationsPanel notifications={notifications} onMarkRead={handleMarkRead} onRefresh={fetchNotifications} />
                <HistoryPanel history={history} onSelectPrediction={handleSelectHistoryPrediction} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3"><EmptyState /></div>
              <div className="space-y-6">
                <ChartUpload onAnalyze={handleChartAnalysis} isAnalyzing={isAnalyzingChart} />
                <NotificationsPanel notifications={notifications} onMarkRead={handleMarkRead} onRefresh={fetchNotifications} />
                <HistoryPanel history={history} onSelectPrediction={handleSelectHistoryPrediction} />
              </div>
            </div>
          )}
        </main>

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </TooltipProvider>
  );
}

export default App;
