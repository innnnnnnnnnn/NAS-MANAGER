import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Play, XCircle, Search } from 'lucide-react';

const Scanner = ({ path, setPath, onScan, onStop, loading, onOpenPicker }) => {
    const [isRecursive, setIsRecursive] = React.useState(true);

    const handleScan = () => {
        if (path) onScan(path, isRecursive);
    };

    return (
        <div className={`glass p-8 rounded-[32px] flex flex-col gap-6 relative z-10 transition-all border ${loading ? 'border-primary/50 shadow-[0_0_40px_rgba(37,99,235,0.1)]' : 'border-white/5'}`}>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-[0.2em]">
                        <Search className="w-3.5 h-3.5" />
                        NAS Discovery Engine
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group bg-white/5 px-4 py-2 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-500 group-hover:text-primary transition-colors tracking-widest uppercase">Deep Scan</span>
                            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Include Subfolders</span>
                        </div>
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                if (!loading) setIsRecursive(!isRecursive);
                            }}
                            className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${isRecursive ? 'bg-primary' : 'bg-slate-800'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${isRecursive ? 'left-7' : 'left-1'}`} />
                        </div>
                    </label>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative group">
                        <button
                            onClick={onOpenPicker}
                            disabled={loading}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 hover:bg-primary/20 rounded-2xl transition-all group-hover:scale-110 active:scale-95 disabled:opacity-30"
                            title="Browse directories"
                        >
                            <FolderOpen className="w-6 h-6 text-primary" />
                        </button>
                        <input
                            type="text"
                            value={path}
                            readOnly={loading}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder="Enter folder path to scan..."
                            className={`w-full bg-slate-900/50 border-2 rounded-3xl py-5 pl-16 pr-6 text-white outline-none transition-all font-mono text-sm tracking-widest ${loading ? 'border-primary/20 opacity-70' : 'border-white/5 focus:border-primary/50'}`}
                        />
                        {loading && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute bottom-0 left-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            />
                        )}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        {loading ? (
                            <button
                                onClick={onStop}
                                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-5 rounded-3xl font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 group shadow-xl"
                            >
                                <XCircle className="w-5 h-5 group-hover:animate-pulse" />
                                Stop Search
                            </button>
                        ) : (
                            <button
                                onClick={handleScan}
                                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-5 rounded-3xl font-black uppercase tracking-widest bg-primary hover:bg-blue-600 text-white shadow-2xl shadow-blue-500/40 active:scale-95 transition-all"
                            >
                                <Play className="w-5 h-5" />
                                Start Scan
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Scanner;
