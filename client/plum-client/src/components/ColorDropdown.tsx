import { useState } from 'react';
import Select from 'react-select';
import constants from '../constants/constants';

const colorArray = Object.keys(constants.colorMap).map((color: string) => ({
    value: color,
    label: color.charAt(0).toUpperCase() + color.slice(1)
}));

function ColorDropdown() {
    const [selectedColor, setSelectedColor] = useState(colorArray[0]);

    return (
        <div className='w-full'>
            <Select
                classNamePrefix="select"
                value={selectedColor}
                onChange={(option) => setSelectedColor(option!)}
                options={colorArray}
                isSearchable={true}
                name="color"
            />
        </div>
    );
}

export default ColorDropdown;