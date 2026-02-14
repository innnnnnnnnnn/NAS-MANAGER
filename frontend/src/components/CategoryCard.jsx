import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, PlayCircle } from 'lucide-react';

const CategoryCard = ({ category, stats, icon: Icon, onClick, color, onExecute }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            className="glass p-6 rounded-2xl group relative flex flex-col justify-between h-56 border border-white/5 hover:border-white/10 transition-all"
        >
            <div className="flex justify-between items-start">
                <div
                    onClick={onClick}
                    className={`p-4 rounded-xl ${color} bg-opacity-20 cursor-pointer hover:bg-opacity-30 transition-all`}
                >
                    <Icon className="w-8 h-8 text-white" />
                </div>
                <button
                    onClick={onClick}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    title="View Details"
                >
                    <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                </button>
            </div>

            <div className="mt-4" onClick={onClick}>
                <h3 className="text-xl font-bold text-white mb-1 cursor-pointer">{category}</h3>
                <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">
                    {stats.count} items • {(stats.size / (1024 * 1024)).toFixed(1)} MB
                </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onExecute();
                    }}
                    disabled={stats.count === 0}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary hover:bg-blue-600 disabled:opacity-30 disabled:grayscale text-white text-xs font-black tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                    <PlayCircle className="w-4 h-4" />
                    EXECUTE
                </button>
            </div>
        </motion.div>
    );
};

export default CategoryCard;
