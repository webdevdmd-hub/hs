
import React from 'react';
import Card from '../ui/Card';
import { BriefcaseIcon } from '../icons/Icons';

interface PlaceholderProps {
  title: string;
  comingSoon?: boolean;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title, comingSoon = true }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-emerald-900 mb-6">{title}</h1>
      <Card>
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <BriefcaseIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-emerald-800">Module Under Construction</h2>
          {comingSoon && (
            <p className="text-slate-500 mt-2">This feature is part of a future development phase. Stay tuned!</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Placeholder;
