function DownHook({ color }: { color: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="7" viewBox="0 0 11 7" fill="none">
            <path d="M0 1.29981C1.1593e-07 2.62589 0.526784 3.89766 1.46447 4.83534C2.40215 5.77302 3.67392 6.2998 5 6.2998V3.30164C4.46908 3.30164 3.95991 3.09073 3.58449 2.71531C3.20907 2.3399 2.99817 1.83072 2.99817 1.2998L0 1.29981Z" fill={color} />
            <path d="M0 1.4998H3V-0.000195503H0V1.4998Z" fill={color} />
            <path d="M10.3 6.2998V3.2998H4.8V6.2998H10.3Z" fill={color} />
        </svg>
    );
}
export default DownHook