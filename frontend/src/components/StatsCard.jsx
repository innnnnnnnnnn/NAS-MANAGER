import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, color }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-2xl flex items-center gap-4 min-w-[200px]"
        >
            <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </motion.div>
    );
};

export default StatsCard;
