import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, ChevronRight, ArrowLeft, X, Check, Link2, Monitor, Edit3 } from 'lucide-react';
import { browseDirectory, connectNAS } from '../api';

const FolderPicker = ({ isOpen, onClose, onSelect, initialPath }) => {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [items, setItems] = useState({ directories: [], parent: '', roots: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nasAddress, setNasAddress] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [manualPath, setManualPath] = useState(initialPath);

    useEffect(() => {
        if (isOpen) {
            loadPath(currentPath || initialPath);
            setManualPath(currentPath || initialPath);
        }
    }, [isOpen]);

    const loadPath = async (path) => {
        setLoading(true);
        setError(null);
        try {
            const data = await browseDirectory(path);
            setItems(data);
            setCurrentPath(data.current);
            setManualPath(data.current);
            setEditMode(false);
        } catch (err) {
            console.error('Failed to browse:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectNAS = async () => {
        if (!nasAddress) return;
        setIsConnecting(true);
        try {
            await connectNAS(nasAddress);
            // Optionally reload /Volumes after a short delay
            setTimeout(() => loadPath('/Volumes'), 2000);
        } catch (err) {
            alert('Failed to trigger connection: ' + err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#0b0f19]">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-[#1e293b] w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col h-[750px] shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/20"
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0f172a]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <Folder className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Select Directory</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* NAS Connection Helper */}
                <div className="p-4 bg-primary/5 border-b border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pl-1">
                        <Link2 className="w-4 h-4" />
                        NAS Connection Helper
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="NAS IP (e.g., 192.168.1.100)"
                            value={nasAddress}
                            onChange={(e) => setNasAddress(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button
                            onClick={handleConnectNAS}
                            disabled={isConnecting}
                            className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isConnecting ? 'Connecting...' : 'CONNECT'}
                        </button>
                    </div>
                </div>

                {/* Quick Access Roots */}
                <div className="p-4 bg-white/5 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                    {items.roots?.map((root) => (
                        <button
                            key={root.path}
                            onClick={() => loadPath(root.path)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${currentPath === root.path
                                ? 'bg-primary text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Monitor className="w-3.5 h-3.5" />
                            {root.name.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="p-4 bg-[#0f172a]/50 flex items-center gap-2 border-b border-white/5">
                    <button
                        onClick={() => {
                            if (items.parent) loadPath(items.parent);
                        }}
                        disabled={!items.parent}
                        className="p-3 hover:bg-white/10 rounded-xl text-gray-400 disabled:opacity-10 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    <div className="flex-1 group relative">
                        {editMode ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualPath}
                                    onChange={(e) => setManualPath(e.target.value)}
                                    autoFocus
                                    className="w-full bg-[#0b0f19] px-6 py-4 rounded-2xl text-sm text-primary font-mono font-bold border border-primary/50 outline-none"
                                />
                                <button
                                    onClick={() => loadPath(manualPath)}
                                    className="bg-primary p-4 rounded-2xl text-white"
                                >
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#0b0f19] px-6 py-4 rounded-2xl flex items-center justify-between border border-white/5 group-hover:border-primary/30 transition-all">
                                <code className="text-sm text-primary font-mono whitespace-nowrap overflow-hidden text-ellipsis block font-bold">
                                    {currentPath}
                                </code>
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="p-1 hover:bg-primary/20 rounded-lg text-primary opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b0f19]/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-500 font-bold tracking-widest uppercase text-[10px]">Accessing Storage...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-24 px-12 text-center gap-6">
                            <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20">
                                <X className="w-12 h-12 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-white font-black uppercase tracking-wider text-lg">Empty or Restricted</h4>
                                <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                                    We couldn't list files in this directory. If this is a NAS, please use the <b>Connection Helper</b> above or ensure it's logged in via Finder.
                                </p>
                            </div>
                            <button
                                onClick={() => loadPath(items.parent || '/')}
                                className="px-8 py-3 rounded-2xl bg-white/5 text-white text-sm hover:bg-white/10 transition-all font-black border border-white/10"
                            >
                                GO BACK
                            </button>
                        </div>
                    ) : (
                        <>
                            {items.directories?.map((dir) => (
                                <button
                                    key={dir.path}
                                    onClick={() => loadPath(dir.path)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl group transition-all text-left border border-transparent hover:border-white/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors shadow-inner">
                                            <Folder className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div>
                                            <span className="text-slate-200 font-bold tracking-wide block">{dir.name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono uppercase">Directory</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                            {(!items.directories || items.directories.length === 0) && (
                                <div className="text-center py-24 text-gray-600 flex flex-col items-center gap-4">
                                    <div className="p-6 bg-white/5 rounded-full">
                                        <Folder className="w-12 h-12 opacity-20" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block font-black uppercase tracking-tighter text-xl opacity-30">Folder is Empty</span>
                                        <span className="text-xs opacity-50">Empty directory or unmounted volume</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-8 border-t border-white/10 bg-[#0f172a] flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-black transition-all tracking-wider text-sm"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={() => {
                            onSelect(currentPath);
                            onClose();
                        }}
                        className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-primary hover:bg-blue-600 text-white font-black shadow-2xl shadow-blue-500/40 active:scale-95 transition-all text-sm tracking-widest"
                    >
                        <Check className="w-5 h-5" />
                        CONFIRM PATH
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default FolderPicker;
