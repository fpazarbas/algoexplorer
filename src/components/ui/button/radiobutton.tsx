import React, { useState } from 'react';

interface RadioButtonProps {
  label: string;
  value: number;
  checked: boolean;
  onChange: (value: number) => void;
}

const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  value,
  checked,
  onChange,
}) => {
  const isFirstButton = value === 25;
  const isLastButton = value === 100;

  return (
    <button
      className={`radio-button ${checked ? 'checked' : ''} ${
        isFirstButton ? 'first-button' : ''
      } ${isLastButton ? 'last-button' : ''}`}
      style={{
        borderRadius: isFirstButton ? '5px 0 0 5px' : isLastButton ? '0 5px 5px 0' : '0',
        border: '1px solid #ccc',
        flex: 1,
        height: '25px',
        backgroundColor: checked ? '#EA3C12' : 'transparent',
      }}
      onClick={() => onChange(value)}
    >
      {label}
    </button>
  );
};


interface RadioButtonGroupProps {
  onSelectedValueChange: (selectedValue: number) => void;
}

const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({ onSelectedValueChange }) => {
  const [selectedValue, setSelectedValue] = useState<number>(0);

  const handleRadioButtonChange = (value: number) => {
    setSelectedValue(value);
    onSelectedValueChange(value); // Pass the selected value to the parent component
  };

  return (
    <div className="radio-button-group" style={{ display: 'flex', width: '50%' }}>
      <RadioButton
        label="25%"
        value={0.25}
        checked={selectedValue === 0.25 ? true : false}
        onChange={handleRadioButtonChange}
      />
      <RadioButton
        label="50%"
        value={0.50}
        checked={selectedValue === 0.50 ? true :false}
        onChange={handleRadioButtonChange}
      />
      <RadioButton
        label="75%"
        value={0.75}
        checked={selectedValue === 0.75 ? true : false}
        onChange={handleRadioButtonChange}
      />
      <RadioButton
        label="Max"
        value={1}
        checked={selectedValue === 1 ? true : false}
        onChange={handleRadioButtonChange}
      />
    </div>
  );
};

export default RadioButtonGroup;

