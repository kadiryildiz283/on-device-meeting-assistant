import React, { useState, useRef } from 'react';
import { 
  View, 
  Animated, 
  TouchableWithoutFeedback, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MeetingScreen } from './modules/meeting/MeetingScreen';
import { HistoryDrawer } from './modules/history/HistoryDrawer';
import { MeetingDetailScreen } from './modules/meeting/MeetingDetailScreen';
import { MeetingModel } from './database/MeetingModel';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.80; // S25 geniş ekranı için %80 idealdir.

const App = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingModel | null>(null);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleSelectMeeting = (meeting: MeetingModel) => {
    setSelectedMeeting(meeting);
    // Seçim sonrası drawer'ı otomatik kapat
    toggleDrawer();
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {/* Ana Toplantı Ekranı */}
        <MeetingScreen onOpenMenu={toggleDrawer} />

        {/* Toplantı Detay Ekranı (Overlay Modu) */}
        {selectedMeeting && (
          <View style={StyleSheet.absoluteFill}>
            <MeetingDetailScreen 
              meeting={selectedMeeting} 
              onBack={() => setSelectedMeeting(null)} 
            />
          </View>
        )}

        {/* Yan Menü Karartma Katmanı */}
        {isDrawerOpen && (
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        {/* Geçmiş (History) Yan Menüsü */}
        <Animated.View 
          style={[
            styles.drawer, 
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <HistoryDrawer onSelectMeeting={handleSelectMeeting} />
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    zIndex: 10 
  },
  drawer: {
    position: 'absolute', 
    top: 0, 
    bottom: 0, 
    left: 0, 
    width: DRAWER_WIDTH,
    backgroundColor: '#111', 
    zIndex: 20, 
    borderRightWidth: 1, 
    borderRightColor: '#333',
    // Android için derinlik (Elevation)
    elevation: 16,
    // iOS için derinlik (Shadow)
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  }
});

export default App;
