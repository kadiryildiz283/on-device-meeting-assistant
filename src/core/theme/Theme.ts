// src/core/theme/Theme.ts
export const Theme = {
    colors: {
        background: '#050505', // Deep space black
        glassSurface: 'rgba(255, 255, 255, 0.06)', // Frosted glass effect
        glassBorder: 'rgba(255, 255, 255, 0.12)',
        primary: '#6366f1', // Vibrant Indigo
        primaryGlow: 'rgba(99, 102, 241, 0.3)',
        text: '#ffffff',
        textMuted: '#8a8a8e', // Apple-like muted grey
        error: '#ff6b6b', // Pastel red for errors
    },
    radius: {
        lg: 24, // Soft edges
        md: 16,
        sm: 8,
    },
    animation: {
        spring: {
            damping: 15,
            stiffness: 250,
            mass: 0.8,
        }
    }
};
