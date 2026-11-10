function UpHook({ color }: { color: string }) {
    return (
        <svg className="mt-1.5" xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 7 7" fill="none">
            <path d="M0 5C1.1593e-07 3.67392 0.526784 2.40215 1.46447 1.46447C2.40215 0.526784 3.67392 -1.58134e-08 5 0V2.99817C4.46908 2.99817 3.95991 3.20907 3.58449 3.58449C3.20907 3.95991 2.99817 4.46908 2.99817 5L0 5Z" fill={color} />
            <path d="M0 4.8H3V6.3H0V4.8Z" fill={color} />
            <path d="M6.3 0V3H4.8V0H6.3Z" fill={color} />
        </svg>
    );
}
export default UpHook