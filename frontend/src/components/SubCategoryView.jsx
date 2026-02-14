import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FileText, Square, CheckSquare, FolderOpen, Move, ChevronRight, Loader2 } from 'lucide-react';
import { browseDirectory } from '../api';

const CATEGORIES = ['PROGRAMS', 'GAMES', 'DOCUMENTS', 'MEDIA', 'DOWNLOADS', 'OTHERS'];

const FileItem = ({ item, isNested = false }) => (
    <div className={`flex items-center gap-3 text-gray-400 py-1 ${isNested ? 'hover:bg-white/5 rounded-lg px-2 -ml-2' : ''}`}>
        <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span className="text-xs truncate">{item.name}</span>
        <span className="text-[10px] text-gray-600 ml-auto font-mono shrink-0">
            {(item.size / (1024 * 1024)).toFixed(2)} MB
        </span>
    </div>
);

const FolderItem = ({ file, isSelected, onToggle, onBatchAction, isNested = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [contents, setContents] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleExpand = async (e) => {
        e.stopPropagation();
        if (isExpanded) {
            setIsExpanded(false);
            return;
        }

        setIsExpanded(true);
        if (!contents) {
            setLoading(true);
            try {
                const data = await browseDirectory(file.path);
                setContents({
                    directories: data.directories || [],
                    files: data.files || []
                });
            } catch (err) {
                console.error('Failed to browse folder:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="space-y-2">
            <div
                onClick={() => onToggle ? onToggle(file) : handleExpand(new Event('click'))}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border ${isNested ? 'p-3 bg-white/5 border-white/5 hover:border-white/10' :
                        isSelected ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-transparent hover:border-white/10'
                    }`}
            >
                <div className="flex items-center gap-4 truncate">
                    {onToggle && (
                        <div className={`p-1 rounded ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </div>
                    )}
                    <div className="relative" onClick={handleExpand}>
                        <FolderOpen className={`transition-transform duration-300 ${isExpanded ? 'text-primary scale-110' : isNested ? 'w-4 h-4 text-primary/50' : 'w-5 h-5 text-primary/70'}`} />
                        {loading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1 text-white" />}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className={`font-bold truncate ${isNested ? 'text-xs text-gray-300' : 'text-sm text-gray-200'} ${isSelected ? 'text-white' : ''}`}>
                            {file.name}
                        </span>
                        {!isNested && <span className="text-[10px] text-gray-500 font-mono">
                            BUNDLE: {file.fileCount} items
                        </span>}
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-mono text-gray-500 tabular-nums">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <ChevronRight
                        onClick={handleExpand}
                        className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-white' : ''}`}
                    />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`${isNested ? 'ml-6' : 'ml-12'} overflow-hidden border-l border-white/10 pl-4 space-y-2`}
                    >
                        {loading ? (
                            <div className="py-4 flex items-center gap-3 text-gray-500 text-[10px] italic">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Indexing...
                            </div>
                        ) : (
                            <>
                                {contents?.directories.map((d, i) => (
                                    <FolderItem
                                        key={i}
                                        file={{ ...d, size: d.size || 0 }}
                                        isNested={true}
                                        onBatchAction={onBatchAction}
                                    />
                                ))}
                                {contents?.files.map((f, i) => (
                                    <FileItem key={i} item={f} isNested={true} />
                                ))}
                                {(!contents || (contents.directories.length === 0 && contents.files.length === 0)) && (
                                    <div className="text-[10px] text-gray-600 italic py-2 text-center">Empty directory</div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SubCategoryView = ({ title, subCategories, onBack, onBatchAction }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const allFilesFlat = useMemo(() => Object.values(subCategories).flat(), [subCategories]);

    const toggleFile = (file) => {
        setSelectedFiles(prev =>
            prev.find(f => f.path === file.path)
                ? prev.filter(f => f.path !== file.path)
                : [...prev, file]
        );
    };

    const handleBatchDelete = () => {
        if (selectedFiles.length === 0) return;
        onBatchAction('delete', selectedFiles);
        setSelectedFiles([]);
    };

    const handleBatchMove = (targetCategory) => {
        if (selectedFiles.length === 0) return;
        onBatchAction('move', {
            paths: selectedFiles.map(f => f.path),
            meta: { targetCategory, targetSub: 'MANUAL' }
        });
        setSelectedFiles([]);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-800 rounded-xl transition-all border border-white/5">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">{title}</h2>
                </div>

                {selectedFiles.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                        <select
                            onChange={(e) => handleBatchMove(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                            defaultValue=""
                        >
                            <option value="" disabled>MOVE TO...</option>
                            {CATEGORIES.filter(c => c !== title).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={handleBatchDelete} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </div>

            <div className="space-y-4">
                {allFilesFlat.sort((a, b) => a.name.localeCompare(b.name)).map((file, idx) => {
                    const isSelected = selectedFiles.some(f => f.path === file.path);

                    if (file.isFolder) {
                        return (
                            <FolderItem
                                key={idx}
                                file={file}
                                isSelected={isSelected}
                                onToggle={toggleFile}
                                onBatchAction={onBatchAction}
                            />
                        );
                    }

                    return (
                        <div
                            key={idx}
                            onClick={() => toggleFile(file)}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border ${isSelected
                                ? 'bg-primary/20 border-primary/40'
                                : 'bg-white/5 border-transparent hover:border-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-4 truncate">
                                <div className={`p-1 rounded ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </div>
                                <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                                <div className="flex flex-col truncate">
                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                        {file.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono lowercase">
                                        {file.sub || 'Misc'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                                <span className="text-xs font-mono text-gray-500 tabular-nums">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SubCategoryView;
