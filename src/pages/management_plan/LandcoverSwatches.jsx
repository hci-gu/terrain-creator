import React from 'react';
import { capitalize } from 'lodash';
const landcoverTypes = [
  { name: 'water', color: '#419BDF' },
  { name: 'trees', color: '#397D49' },
  { name: 'grass', color: '#88B053' },
  { name: 'shrub', color: '#DFC35A' },
  { name: 'crops', color: '#E49635' },
  { name: 'built', color: '#C4281B' },
  { name: 'bare', color: '#5e6572' },
  { name: 'snow', color: '#B39FE1' },
  { name: 'flooded vegetation', color: '#7A87C6' },
];

export const LandcoverSwatches = ({ selectedType, onSelect }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <p className="text-2xl font-bold">Landcovers</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {landcoverTypes.map((type) => (
          <div key={type.name} className="flex flex-col items-center gap-1">
            <button
              className={`w-10 h-10 rounded-sm border ${
                selectedType === type.name ? 'ring-2 ring-primary' : ''
              }`}
              style={{ backgroundColor: type.color }}
              onClick={() => onSelect(type.name)}
              aria-label={type.name}
            />
            <p className="text-sm font-medium text-center">{capitalize(type.name)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandcoverSwatches; 