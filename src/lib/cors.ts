// Secure CORS configuration for edge functions
export const getAllowedOrigins = (): string[] => {
  const origins: string[] = [
    'https://procuremind.com',
    'https://www.procuremind.com',
    'https://0b762ee2-5a0e-4d35-a836-8d0aa2d5a8c9.lovableproject.com',
  ];
  
  // Get custom allowed origin from environment
  const customOrigin = typeof window !== 'undefined' 
    ? import.meta.env.VITE_ALLOWED_ORIGIN 
    : undefined;
  
  if (customOrigin) {
    origins.push(customOrigin);
  }
  
  // Allow localhost in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    origins.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
  }
  
  return origins.filter(Boolean);
};

export const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.some(allowed => origin.startsWith(allowed) || origin === allowed);
};
