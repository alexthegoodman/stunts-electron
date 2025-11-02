import React from 'react';

interface HealthBarProps {
  health: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ health }) => {
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
      <div style={{ width: 200, height: 20, backgroundColor: '#f00' }}>
        <div style={{ width: `${health}%`, height: '100%', backgroundColor: '#0f0' }} />
      </div>
    </div>
  );
};

export default HealthBar;
