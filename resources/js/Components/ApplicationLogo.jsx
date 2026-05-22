export default function ApplicationLogo({ variant = 'small', alt = 'FinTrack', className = '', ...props }) {
    const src = variant === 'large' ? '/logoKecil.png' : '/logoKecil.png';

    return (
        <img
            {...props}
            alt={alt}
            className={`object-contain ${className}`}
            src={src}
        />
    );
}
