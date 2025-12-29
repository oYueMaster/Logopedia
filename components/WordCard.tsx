
import React from 'react';
import { PECSItem } from '../types';

interface WordCardProps {
  // Fix: Changed 'TargetItem' to 'PECSItem' as it is the correct type exported from types.ts
  item: PECSItem;
  isSelected: boolean;
  onClick: () => void;
}

const WordCard: React.FC<WordCardProps> = ({ item, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-3xl p-4 transition-all duration-300
        flex flex-col items-center gap-3 border-4
        ${isSelected 
          ? 'border-blue-500 bg-blue-100 scale-105 shadow-xl' 
          : 'border-white bg-white hover:border-blue-200 shadow-md hover:scale-102'}
      `}
    >
      <img 
        src={item.image} 
        alt={item.name} 
        className="w-32 h-32 rounded-2xl object-cover"
      />
      <span className="text-xl font-bold text-blue-800 uppercase tracking-wide">
        {item.name}
      </span>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
};

export default WordCard;
