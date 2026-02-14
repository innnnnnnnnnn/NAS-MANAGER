import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Copy, AlertTriangle } from 'lucide-react';

const DuplicateManager = ({ duplicates, onBack, onDelete }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    Duplicate Detection
                    <span className="text-lg font-normal text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                        {duplicates.length} groups found
                    </span>
                </h2>
            </div>

            <div className="space-y-8">
                {duplicates.map((group, idx) => (
                    <div key={idx} className="glass p-6 rounded-2xl border-l-4 border-yellow-500">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Copy className="w-5 h-5 text-yellow-500" />
                                <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                                    MD5: {group.hash}
                                </h3>
                            </div>
                            <p className="text-sm font-medium text-red-400">
                                Potential Savings: {(group.totalSize / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        </div>

                        <div className="space-y-2">
                            {group.files.map((file, fIdx) => (
                                <div key={fIdx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl group hover:bg-slate-900 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-medium truncate max-w-lg">{file.name}</span>
                                        <span className="text-xs text-gray-500 truncate max-w-lg" title={file.path}>{file.path}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs tabular-nums text-gray-400">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </span>
                                        <button
                                            onClick={() => onDelete(file.path)}
                                            className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete this copy"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 italic">
                            <AlertTriangle className="w-3 h-3" />
                            Keep at least one copy. Deleting all copies will remove the file entirely.
                        </div>
                    </div>
                ))}

                {duplicates.length === 0 && (
                    <div className="text-center py-20">
                        <Copy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500">No duplicate files found in this scan.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default DuplicateManager;
