import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Files,
  Copy,
  Settings,
  Cpu,
  Gamepad2,
  FileText,
  Download,
  Layout,
  HardDrive,
  Search,
  ChevronRight,
  FolderOpen,
  Box
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStatus, API_BASE, executeCategory, batchAction, learnPattern } from './api';
import StatsCard from './components/StatsCard';
import CategoryCard from './components/CategoryCard';
import Scanner from './components/Scanner';
import SubCategoryView from './components/SubCategoryView';
import DuplicateManager from './components/DuplicateManager';
import FolderPicker from './components/FolderPicker';

const categoryIcons = {
  PROGRAMS: { icon: Cpu, color: 'bg-blue-500' },
  GAMES: { icon: Gamepad2, color: 'bg-purple-500' },
  DOCUMENTS: { icon: FileText, color: 'bg-emerald-500' },
  MEDIA: { icon: Files, color: 'bg-orange-500' },
  DOWNLOADS: { icon: Download, color: 'bg-cyan-500' },
  OTHERS: { icon: Box, color: 'bg-gray-500' }
};

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [currentView, setCurrentView] = useState({ type: 'dashboard', id: null });
  const [serverStatus, setServerStatus] = useState('offline');
  const [scannerPath, setScannerPath] = useState('/Users/innnnnnnnnnnmbp/Downloads');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [eventSource, setEventSource] = useState(null);

  useEffect(() => {
    getStatus().then(() => setServerStatus('online')).catch(() => setServerStatus('offline'));
  }, []);

  const DEFAULT_CATEGORIES = ['PROGRAMS', 'GAMES', 'DOCUMENTS', 'MEDIA', 'DOWNLOADS', 'OTHERS'];

  const { categorizedData, stats } = useMemo(() => {
    const initial = DEFAULT_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = { count: 0, size: 0, subCategories: {}, allFiles: [] };
      return acc;
    }, {});

    let totalFiles = 0;
    let totalSize = 0;

    const data = scannedFiles.reduce((acc, file) => {
      totalFiles += 1;
      totalSize += (file.size || 0);

      const cat = file.primary || 'OTHERS';
      const node = acc[cat];
      if (node) {
        node.count += 1;
        node.size += (file.size || 0);
        node.allFiles.push(file);

        const sub = file.sub || 'Misc';
        if (!node.subCategories[sub]) node.subCategories[sub] = [];
        node.subCategories[sub].push(file);
      }
      return acc;
    }, initial);

    return { categorizedData: data, stats: { totalFiles, totalSize } };
  }, [scannedFiles]);

  const [hasScannedOnce, setHasScannedOnce] = useState(false);

  const handleScan = (path, recursive = false) => {
    if (eventSource) eventSource.close();

    setScannedFiles([]);
    setIsScanning(true);
    setHasScannedOnce(true);
    setCurrentView({ type: 'dashboard', id: null });

    const es = new EventSource(`${API_BASE}/scan-stream?directory=${encodeURIComponent(path)}&recursive=${recursive}`);
    setEventSource(es);

    const finishScan = (reason = 'normal') => {
      console.log(`[Scan] Finalizing: ${reason}`);
      if (es) es.close();
      setIsScanning(false);
      setEventSource(null);
    };

    es.onerror = (e) => {
      console.error('[SSE] Connection Error:', e);
      if (es.readyState === EventSource.CLOSED) {
        finishScan('error');
      }
    };

    es.onmessage = (event) => {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'files') {
          // Direct real-time update to avoid race conditions
          setScannedFiles(prev => [...prev, ...msg.data]);
        } else if (msg.type === 'done') {
          finishScan('done');
        } else if (msg.type === 'error') {
          console.error('[SSE] Server error:', msg.message);
          finishScan('server-error');
        }
      } catch (e) {
        // Heartbeats
      }
    };
  };

  const handleStopScan = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsScanning(false);
    }
  };

  const handleExecute = async (category) => {
    const flatFiles = categorizedData[category]?.allFiles;
    if (!flatFiles || flatFiles.length === 0) return;

    if (!window.confirm(`Moving ${flatFiles.length} files in ${category} to organized folders. Proceed?`)) return;

    try {
      setIsScanning(true); // Re-use loading state
      const result = await executeCategory(scannerPath, category, flatFiles);
      alert(`Success: Moved ${result.moved} files. Failed: ${result.failed}`);

      // Remove moved files from state
      setScannedFiles(prev => prev.filter(f => !flatFiles.find(mf => mf.path === f.path)));
    } catch (error) {
      alert('Execution failed: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBatchAction = async (action, files) => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${files.length} files?`)) return;
      try {
        await batchAction('delete', files.map(f => f.path));
        setScannedFiles(prev => prev.filter(f => !files.find(df => df.path === f.path)));
      } catch (error) {
        alert('Batch delete failed');
      }
    } else if (action === 'move') {
      const { targetCategory, targetSub } = files.meta;

      // 1. Virtual move in state (Keep original path!)
      setScannedFiles(prev => prev.map(f => {
        if (files.paths.includes(f.path)) {
          return { ...f, primary: targetCategory, sub: targetSub || 'Manual' };
        }
        return f;
      }));

      // 2. Persistent Learning: Direct backend to remember this choice
      files.paths.forEach(path => {
        const file = scannedFiles.find(f => f.path === path);
        if (file) {
          learnPattern(file, targetCategory, targetSub || 'Manual').catch(err =>
            console.error('[Learn] Failed to record pattern:', err)
          );
        }
      });
      console.log(`[App] Virtual move & learning triggered for ${files.paths.length} items`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <HardDrive className="w-10 h-10 text-primary" />
              NAS MANAGER
            </h1>
            <p className="text-gray-400 mt-2">Intelligent File Classification & Cleanup</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-2 border ${serverStatus === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              Server {serverStatus}
            </div>
            <button className="p-3 glass rounded-xl text-gray-400 hover:text-white transition-all">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentView.type === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
              <Scanner
                path={scannerPath}
                setPath={setScannerPath}
                onScan={handleScan}
                onStop={handleStopScan}
                loading={isScanning}
                onOpenPicker={() => setIsPickerOpen(true)}
              />

              {(hasScannedOnce || isScanning) ? (
                <>
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatsCard
                      title="Total Units"
                      value={stats.totalFiles.toLocaleString()}
                      icon={Files}
                      color="bg-primary"
                    />
                    <StatsCard
                      title="Staged Size"
                      value={`${(stats.totalSize / (1024 * 1024)).toFixed(1)} MB`}
                      icon={Files}
                      color="bg-emerald-500"
                    />
                    <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col justify-center bg-black/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scan Engine</span>
                          <span className={`text-xl font-black block ${isScanning ? 'text-primary animate-pulse' : 'text-white'}`}>
                            {isScanning ? 'LIVE DISCOVERY' : 'ENGINE IDLE'}
                          </span>
                        </div>
                        {isScanning && (
                          <div className="text-right">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Files Found</span>
                            <span className="text-xl font-black text-white block">
                              {scannedFiles.length.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {isScanning && <div className="h-1 bg-primary/30 mt-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="h-full w-1/2 bg-primary shadow-[0_0_15px_rgba(37,99,235,0.8)]"
                        />
                      </div>}
                    </div>
                  </section>

                  {scannedFiles.length === 0 && !isScanning ? (
                    <div className="text-center py-20 bg-yellow-500/5 border border-yellow-500/20 rounded-3xl">
                      <Search className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                      <h3 className="text-yellow-500 font-bold uppercase tracking-widest">No Items Found</h3>
                      <p className="text-gray-500 text-sm mt-2">The directory might be empty, or permissions are restricted.</p>
                    </div>
                  ) : (
                    <>
                      <section className="space-y-6">
                        <div className="flex justify-between items-end">
                          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Summary Overview</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                          {Object.entries(categorizedData).map(([name, stats]) => {
                            const { icon, color } = categoryIcons[name] || categoryIcons.OTHERS;
                            return (
                              <CategoryCard
                                key={name}
                                category={name}
                                stats={stats}
                                icon={icon}
                                color={color}
                                onClick={() => setCurrentView({ type: 'sub', id: name })}
                                onExecute={() => handleExecute(name)}
                              />
                            );
                          })}
                        </div>
                      </section>

                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-32 glass rounded-3xl border border-white/5 border-dashed">
                  <Files className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-bold">READY TO COMMENCE SCAN</p>
                  <p className="text-gray-500 mt-2">Target directory not yet analyzed.</p>
                </div>
              )}
            </motion.div>
          )}

          {currentView.type === 'sub' && (
            <SubCategoryView
              key="sub"
              title={currentView.id}
              subCategories={categorizedData[currentView.id].subCategories}
              onBack={() => setCurrentView({ type: 'dashboard', id: null })}
              onBatchAction={handleBatchAction}
            />
          )}

          {currentView.type === 'duplicates' && (
            <DuplicateManager
              key="duplicates"
              duplicates={[]} // Duplicates can be derived later
              onBack={() => setCurrentView({ type: 'dashboard', id: null })}
            />
          )}
        </AnimatePresence>
      </div>

      <FolderPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(newPath) => setScannerPath(newPath)}
        initialPath={scannerPath}
      />
    </div>
  );
}

export default App;
