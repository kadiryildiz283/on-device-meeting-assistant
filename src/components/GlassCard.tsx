import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../core/theme/Theme';

interface GlassCardProps {
    isActive?: boolean;
    onPress?: () => void;
    children: React.ReactNode;
    style?: ViewStyle;
}

export const GlassCard = ({ isActive, onPress, children, style }: GlassCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            ...Theme.animation.spring,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            ...Theme.animation.spring,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable 
            onPress={onPress} 
            onPressIn={handlePressIn} 
            onPressOut={handlePressOut}
        >
            <Animated.View style={[
                styles.card,
                isActive && styles.cardActive,
                { transform: [{ scale: scaleAnim }] },
                style
            ]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Theme.colors.glassSurface,
        borderRadius: Theme.radius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.glassBorder,
        padding: 20,
        overflow: 'hidden',
    },
    cardActive: {
        borderColor: Theme.colors.primary,
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    }
});
