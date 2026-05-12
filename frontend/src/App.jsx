import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { Shield, ShieldAlert, Activity, Search, Globe, ChevronRight, CheckCircle, Network, Link as LinkIcon, Loader2, Download, FileJson, Brain, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

const API_BASE_URL = 'http://localhost:5000/api';

const Navbar = ({ account, connectWallet, isConnecting }) => (
  <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <Network className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
          Decentralized CensorScope
        </span>
      </Link>
      
      <div className="flex gap-6 items-center">
        <Link to="/analytics" className="text-slate-300 hover:text-white transition-colors font-medium">Network Analytics</Link>
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700 hover:border-slate-500 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : (account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Connect Wallet')}
        </button>
      </div>
    </div>
  </nav>
);

const SearchBar = ({ onSearch, loading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) onSearch(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto mt-12 relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-12 pr-48 py-4 glass rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 transition-all"
        placeholder="Enter a domain to verify (e.g., example.com)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Requesting...</> : 'Request Verification'}
      </button>
    </form>
  );
};

const PredictRiskButton = ({ domain, country }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/predict?domain=${domain}&country=${country}`);
      setPrediction(res.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (prediction) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-300 flex items-center gap-1.5"><Brain className="w-4 h-4 text-indigo-400" /> AI Prediction</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${prediction.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : prediction.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            {prediction.riskLevel} RISK ({prediction.probability}%)
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{prediction.explanation}</p>
      </div>
    );
  }

  return (
    <button onClick={handlePredict} disabled={loading} className="w-full mt-4 py-2.5 bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-lg text-indigo-400 text-sm font-medium transition-all flex items-center justify-center gap-2 group">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />}
      Predict Future Risk
    </button>
  );
};

const ResultsDashboard = ({ domain, results }) => {
  if (!domain || !results) return null;

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ domain, timestamp: new Date().toISOString(), results }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${domain}_report.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text("CensorScope Intelligence Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Target Domain: ${domain}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    
    doc.autoTable({
      startY: 45,
      head: [['Country', 'Status', 'Confidence', 'Reason', 'IPFS CID']],
      body: results.map(r => [
        r.country,
        r.status === 'completed' ? (r.isBlocked ? 'Blocked' : 'Accessible') : r.status,
        r.confidence ? `${r.confidence}%` : 'N/A',
        r.blockType || 'N/A',
        r.ipfsCid || 'N/A'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`${domain}_censorship_report.pdf`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass p-6 rounded-3xl border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Network className="w-6 h-6 text-cyan-400" />
              Decentralized Network Status
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-slate-400">Target: <span className="text-indigo-400 font-medium">{domain}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleExportJSON} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm font-medium transition-colors flex items-center gap-2">
               <FileJson className="w-4 h-4 text-emerald-400" /> Export JSON
             </button>
             <button onClick={handleExportPDF} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20">
               <Download className="w-4 h-4" /> Download PDF
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {results.map((r, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/50 relative overflow-hidden">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-xl text-white">{r.country}</h3>
                </div>
                
                {r.status === 'pending' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gathering Nodes
                  </span>
                )}
                
                {r.status === 'completed' && (
                   r.isBlocked ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                      <ShieldAlert className="w-3.5 h-3.5" /> Blocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> Accessible
                    </span>
                  )
                )}
              </div>
              
              {r.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-red-950/20 rounded-lg border border-red-900/30">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-red-400 font-bold">Consensus Failed</p>
                    <p className="text-xs text-slate-400 text-center px-4">Oracle could not finalize the result on the blockchain. {r.errorMsg}</p>
                </div>
              ) : r.status === 'pending' ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <p className="text-sm text-slate-400 text-center">Awaiting signatures from distributed verification nodes.</p>
                    <div className="text-2xl font-bold text-indigo-400">{r.votesReceived} / 3 Nodes</div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                     <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${(r.votesReceived / 3) * 100}%` }}
                     />
                   </div>
                </div>
              ) : r.status === 'completed' ? (
                <div className="space-y-4">
                  {r.isBlocked && (
                    <div className="text-sm bg-red-950/20 p-3 rounded-lg border border-red-900/30">
                      <p className="text-slate-400 mb-1">Block Method:</p>
                      <p className="text-red-300 font-medium">{r.blockType}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1.5 pt-2">
                     <div className="flex justify-between items-center">
                       <span className="text-xs text-slate-400">Network Consensus Strength</span>
                       <span className={`text-xs font-bold ${r.confidence > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.confidence}%</span>
                     </div>
                     <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                       <div 
                          className={`h-full ${r.confidence > 80 ? 'bg-emerald-500' : r.confidence > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${r.confidence}%` }}
                       />
                     </div>
                  </div>

                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-xs space-y-2 mt-4">
                     <div className="flex justify-between items-center">
                       <span className="text-slate-500">Participating Nodes:</span>
                       <span className="font-bold text-indigo-300">{r.totalVotes}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-slate-500">Oracle Tx Hash:</span>
                       <a href="#" className="font-mono text-cyan-400 hover:underline flex items-center gap-1">
                         {r.txHash ? `${r.txHash.substring(0,10)}...` : 'Pending'} <LinkIcon className="w-3 h-3" />
                       </a>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-slate-500">Raw IPFS Data:</span>
                       <a href={`https://gateway.pinata.cloud/ipfs/${r.ipfsCid}`} target="_blank" rel="noreferrer" className="font-mono text-emerald-400 hover:underline flex items-center gap-1 max-w-[150px] truncate">
                         {r.ipfsCid} <LinkIcon className="w-3 h-3 flex-shrink-0" />
                       </a>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-sm text-slate-500">Not queued for verification.</p>
                </div>
              )}
              
              <PredictRiskButton domain={domain} country={r.country} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/analytics`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Syncing with Blockchain & IPFS...</p>
      </div>
    );
  }

  if (!data) return null;

  // Process Data for Charts
  const totalEvents = data.events.length;
  const blockedEvents = data.events.filter(e => e.isBlocked).length;
  const activeNodes = data.nodes.length;
  const avgTrustScore = activeNodes > 0 ? Math.round(data.nodes.reduce((acc, n) => acc + n.trustScore, 0) / activeNodes) : 0;

  // Country Bar Chart Data
  const countryCounts = {};
  data.events.filter(e => e.isBlocked).forEach(e => {
    countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
  });
  
  const barData = {
    labels: Object.keys(countryCounts),
    datasets: [{
      label: 'Blocked Sites',
      data: Object.values(countryCounts),
      backgroundColor: 'rgba(99, 102, 241, 0.6)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  // Censorship Types Doughnut Chart Data
  const typeCounts = {};
  data.events.filter(e => e.isBlocked).forEach(e => {
    typeCounts[e.blockType] = (typeCounts[e.blockType] || 0) + 1;
  });

  const doughnutData = {
    labels: Object.keys(typeCounts),
    datasets: [{
      data: Object.values(typeCounts),
      backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // Time-Series Line Chart Data
  const sortedEvents = [...data.events].sort((a, b) => a.timestamp - b.timestamp);
  const timeLabels = [];
  const cumulativeData = [];
  let currentTotal = 0;
  
  sortedEvents.forEach(e => {
    const d = new Date(e.timestamp);
    timeLabels.push(`${d.getHours()}:${d.getMinutes() < 10 ? '0'+d.getMinutes() : d.getMinutes()}`);
    currentTotal++;
    cumulativeData.push(currentTotal);
  });

  const lineData = {
    labels: timeLabels,
    datasets: [{
      label: 'Cumulative Verifications Logged',
      data: cumulativeData,
      fill: true,
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      borderColor: 'rgba(6, 182, 212, 1)',
      tension: 0.4
    }]
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-8 space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-indigo-400" />
          Global Censorship Analytics
        </h2>
        <p className="text-slate-400 mt-2">Real-time insights aggregated from decentralized verification nodes, anchored on-chain.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Verifications', value: totalEvents, color: 'text-indigo-400' },
          { label: 'Censorship Events', value: blockedEvents, color: 'text-red-400' },
          { label: 'Active Nodes', value: activeNodes, color: 'text-emerald-400' },
          { label: 'Avg Network Trust', value: `${avgTrustScore} / 1000`, color: 'text-cyan-400' }
        ].map((kpi, idx) => (
          <div key={idx} className="glass p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/30 transition-all shadow-lg">
            <p className="text-slate-400 text-sm font-medium mb-1">{kpi.label}</p>
            <p className={`text-4xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-700/50 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-6">Verification Volume Over Time (24h)</h3>
          <div className="h-[300px] w-full">
            <Line data={lineData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border border-slate-700/50 flex flex-col shadow-lg">
          <h3 className="text-xl font-bold text-white mb-6">Censorship Methods</h3>
          <div className="h-[250px] w-full flex-1 flex items-center justify-center">
            {Object.keys(typeCounts).length > 0 ? (
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }} />
            ) : (
               <p className="text-slate-500 text-center">No censorship detected yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="glass p-6 rounded-2xl border border-slate-700/50 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-6">Censorship Events by Region</h3>
        <div className="h-[300px] w-full">
           <Bar data={barData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {/* Blockchain Transparency Table */}
      <div className="glass p-6 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Recent On-Chain Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-sm">
                <th className="pb-4 pr-4 font-medium">Domain</th>
                <th className="pb-4 px-4 font-medium">Country</th>
                <th className="pb-4 px-4 font-medium">Status</th>
                <th className="pb-4 px-4 font-medium">Confidence</th>
                <th className="pb-4 px-4 font-medium">IPFS Data Hash</th>
                <th className="pb-4 pl-4 font-medium text-right">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...data.events].reverse().slice(0, 10).map((e, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 pr-4 font-medium text-white">{e.domain}</td>
                  <td className="py-4 px-4 text-slate-300">{e.country}</td>
                  <td className="py-4 px-4">
                    {e.isBlocked ? 
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20"><ShieldAlert className="w-3.5 h-3.5"/> Blocked</span> :
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20"><CheckCircle className="w-3.5 h-3.5"/> Accessible</span>
                    }
                  </td>
                  <td className="py-4 px-4 text-cyan-400 font-mono text-sm">{e.confidence}% ({e.totalVotes} nodes)</td>
                  <td className="py-4 px-4">
                    <a href={`https://gateway.pinata.cloud/ipfs/${e.ipfsCid}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline font-mono text-sm truncate block max-w-[150px]">
                      {e.ipfsCid}
                    </a>
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <a href={`https://mumbai.polygonscan.com/tx/${e.txHash}`} target="_blank" rel="noreferrer" className="text-slate-500 font-mono text-sm truncate block w-24 ml-auto hover:text-slate-300 hover:underline">
                      {e.txHash.substring(0, 10)}...
                    </a>
                  </td>
                </tr>
              ))}
              {data.events.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">No verifications logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [activeDomain, setActiveDomain] = useState('');
  const [networkResults, setNetworkResults] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSearch = async (url) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/request`, { url });
      setActiveDomain(res.data.domain);
    } catch (err) {
      console.error(err);
      alert('Failed to request verification from the network.');
    }
    setLoading(false);
  };

  // Polling mechanism to watch network assemble consensus
  useEffect(() => {
    let intervalId;
    if (activeDomain) {
      const fetchStatus = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/status/${activeDomain}`);
          setNetworkResults(res.data.results);
          
          // Check if all are completed or failed
          const allCompleted = res.data.results.every(r => r.status === 'completed' || r.status === 'failed' || r.status === 'unknown');
          if (allCompleted) clearInterval(intervalId);
          
        } catch(e) {
          console.error("Polling error", e);
        }
      };
      
      fetchStatus();
      intervalId = setInterval(fetchStatus, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeDomain]);

  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden bg-slate-950">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

        <Navbar account={account} connectWallet={connectWallet} isConnecting={isConnecting} />

        <main className="px-6 relative z-10">
          <Routes>
            <Route path="/" element={
              <div className="pt-20 pb-12">
                <div className="text-center max-w-4xl mx-auto space-y-6">
                  <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
                    Decentralized, Trustless <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Censorship Verification</span>
                  </h1>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    Submit a domain to the network. Independent nodes worldwide will verify its accessibility and securely log the consensus to the blockchain.
                  </p>
                </div>
                
                <SearchBar onSearch={handleSearch} loading={loading} />
                
                {activeDomain && (
                    <ResultsDashboard domain={activeDomain} results={networkResults} />
                )}
              </div>
            } />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
