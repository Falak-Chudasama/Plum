import { useEffect, useState } from 'react';
import Select, { type StylesConfig } from 'react-select';
import constants from '../constants/constants';
import { useStore } from 'zustand';
import ColorDropdownDataStore from '../store/ColorDropdownDataStore';
import utils from '../utils/utils';

type ColorOption = { value: string; label: string };

const colorArray: ColorOption[] = Object.keys(constants.colorMap).map((color) => ({
    value: color,
    label: utils.capitalizeWords(color),
}));

function resolveColor(key?: string) {
    const colorKey = key?.toLowerCase();
    return constants.colorMap[colorKey] ?? { light: '#f7f7f7', dark: '#333' };
}

const dropDownStyle: StylesConfig<ColorOption, false> = {
    control: (base, state) => {
        const { light, dark } = resolveColor(state.selectProps.value?.value);
        return {
            ...base,
            borderRadius: '9999px',
            minHeight: '2.3rem',
            paddingInline: '0.25rem',
            boxShadow: 'none',
            color: dark,
            backgroundColor: light,
            border: 'none',
            outline: 'none'
        };
    },
    indicatorSeparator: (base) => ({
        ...base,
        display: 'none',
    }),
    singleValue: (base, state) => {
        const { dark } = resolveColor(state.selectProps.value?.value);
        return {
            ...base,
            color: dark,
            fontWeight: 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: '100%',
        };
    },
    placeholder: (base) => ({
        ...base,
        fontWeight: 400,
    }),
    dropdownIndicator: (base, state) => {
        const { dark } = resolveColor(state.selectProps.value?.value);
        return {
            ...base,
            color: dark,
            '&:hover': {
                color: dark
            }
        };
    },
    option: (base, { isFocused, isSelected }) => {
        return {
            ...base,
            backgroundColor: isSelected ? '#eee' : isFocused ? '#f5f5f5' : 'white',
            color: constants.plumColors.secondary,
            cursor: 'pointer',
            ':active': {
                backgroundColor: '#f5f5f5',
            }
        };
    },
};

function ColorDropdown() {
    const { selectedColor, setSelectedColor } = useStore(ColorDropdownDataStore);

    return (
        <div className="w-full">
            <Select
                classNamePrefix="select"
                value={selectedColor}
                onChange={(option) => setSelectedColor(option as ColorOption)}
                options={colorArray}
                isSearchable={true}
                name="color"
                styles={dropDownStyle}
                className="duration-300"
            />
        </div>
    );
}

export default ColorDropdown;