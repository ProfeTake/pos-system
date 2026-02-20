import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    placeholder?: string;
}

export function LazyImage({ src, placeholder, className, alt, ...props }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsInView(true);
                observer.disconnect();
            }
        });

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    return (
        <div className={`relative overflow-hidden ${className}`} ref={imgRef as any}>
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"
                        } ${className}`}
                    onLoad={handleLoad}
                    {...props}
                />
            )}
            {(!isLoaded || !isInView) && placeholder && (
                <img
                    src={placeholder}
                    alt={alt}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-0" : "opacity-100"
                        }`}
                />
            )}
            {(!isLoaded || !isInView) && !placeholder && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
        </div>
    );
}
