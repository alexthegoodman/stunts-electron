import React from 'react';

interface HealthBarProps {
  health: number;
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

const HealthBar: React.FC<HealthBarProps> = ({ health, position }) => {
  return (
    <div style={{ position: 'absolute', ...position, zIndex: 10 }}>
      <div style={{ width: 200, height: 20, backgroundColor: '#f00' }}>
        <div style={{ width: `${health}%`, height: '100%', backgroundColor: '#0f0' }} />
      </div>
    </div>
  );
};

export default HealthBar;
