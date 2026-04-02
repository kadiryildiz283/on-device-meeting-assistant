import React, { useState, useRef } from 'react';
import { View, Animated, TouchableWithoutFeedback, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MeetingScreen } from './modules/meeting/MeetingScreen';
import { HistoryDrawer } from './modules/history/HistoryDrawer';
import { MeetingDetailScreen } from './modules/meeting/MeetingDetailScreen';
import { MeetingModel } from './database/MeetingModel';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

const App = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingModel | null>(null);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleSelectMeeting = (meeting: MeetingModel) => {
    setSelectedMeeting(meeting);
    toggleDrawer();
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <MeetingScreen onOpenMenu={toggleDrawer} />

        {selectedMeeting && (
            <View style={StyleSheet.absoluteFill}>
                <MeetingDetailScreen 
                    meeting={selectedMeeting} 
                    onBack={() => setSelectedMeeting(null)} 
                />
            </View>
        )}

        {isDrawerOpen && (
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <HistoryDrawer onSelectMeeting={handleSelectMeeting} />
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH,
    backgroundColor: '#111', zIndex: 20, borderRightWidth: 1, borderRightColor: '#333',
    elevation: 20,
  }
});

export default App;
