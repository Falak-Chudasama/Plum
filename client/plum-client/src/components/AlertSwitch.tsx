import { useEffect, useRef, useState } from 'react'
import AlertSwitchDataStore from '../store/AlertSwitchDataStore';
import { useStore } from 'zustand';

function AlertSwitch() {
    const [isChecked, setIsChecked] = useState(false)
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number }>({ left: 0 });

    const { setAlertState } = useStore(AlertSwitchDataStore);

    setAlertState({
        isChecked,
        setIsChecked
    });

    const handleSwitch = (switchRef, alert: boolean) => {
        if (switchRef.current) {
            setIndicatorStyle({ left: switchRef.current.offsetLeft });
            setIsChecked(alert);
        }
    }

    const alertSwitchRef = useRef(null);
    const dontAlertSwitchRef = useRef(null);

    useEffect(() => {
        setIndicatorStyle({ left: dontAlertSwitchRef.current.offsetLeft });
    }, []);
    
    useEffect(() => {
        if (isChecked) {
            setIndicatorStyle({ left: alertSwitchRef.current.offsetLeft });
        } else {
            setIndicatorStyle({ left: dontAlertSwitchRef.current.offsetLeft });
        }
    }, [isChecked]);

    const spanClass = `flex items-center justify-center duration-300 space-x-[6px] py-1 px-5 relative z-30 text-sm font-medium rounded-full bg-transparent`;

    return (
        <label className="bg-plum-bg duration-300 w-full shadow-card relative flex gap-2 cursor-pointer select-none items-center justify-center rounded-full p-1 font-cabin">
            <input
                type="checkbox"
                className="sr-only w-1/2 z-20"
                checked={isChecked}
                onChange={() => {}}
            />
            <span 
                className='absolute w-1/2 h-[calc(100%-8px)] bg-plum-primary-dark z-10 rounded-full transition-all duration-300'
                style={{
                    left: `${indicatorStyle.left}px`,
                }}
                aria-hidden="true"
            />
            <div ref={alertSwitchRef} className='w-1/2 relative'>
                <span
                    onClick={() => handleSwitch(alertSwitchRef, true)}
                    className={`${isChecked ? 'text-plum-bg' : 'text-plum-secondary'} ${spanClass}`}
                >
                    Alert Me
                </span>
            </div>
            <div ref={dontAlertSwitchRef} className='w-1/2 relative'>
                <span
                    onClick={() => handleSwitch(dontAlertSwitchRef, false)}
                    className={`${!isChecked ? 'text-plum-bg' : 'text-plum-secondary'} ${spanClass}`}
                >
                    Don't Alert
                </span>
            </div>
        </label>
    )
}

export default AlertSwitch