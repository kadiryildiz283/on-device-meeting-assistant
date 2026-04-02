import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Animated, 
  TouchableWithoutFeedback, 
  StyleSheet, 
  Dimensions, 
  Platform, 
  Linking, 
  Alert 
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

// App.tsx içindeki requestAllFilesAccess fonksiyonunu şu şekilde revize et:

const requestAllFilesAccess = async () => {
  if (Platform.OS === 'android') {
    const packageName = 'com.conferenceai'; // AndroidManifest içindeki package adınla aynı olmalı
    
    Alert.alert(
      "Özel Dosya Erişimi Gerekli",
      "7B model dosyasını okuyabilmemiz için 'Tüm dosyalara erişim' iznini manuel olarak açmanız gerekmektedir.",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "İzni Aç", 
          onPress: () => {
            // Android 11+ için spesifik 'Manage All Files' sayfasını açar
            Linking.openURL(`package:${packageName}`).catch(() => {
                // Eğer paket yolu hata verirse genel ayarları aç
                Linking.openSettings();
            });
            
            // Alternatif: Bazı cihazlarda bu intent daha iyi çalışır
            // Linking.sendIntent('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION', [{ key: 'package', value: packageName }]);
          } 
        }
      ]
    );
  }
};
  /**
   * Stratejik Karar: Android 11+ (API 30+) cihazlarda 7B modeline 
   * erişim sağlamak için özel 'MANAGE_EXTERNAL_STORAGE' izni tetiklenmelidir.
   */
  useEffect(() => {
    const handleSpecialPermissions = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 30) {
        // Bu izin 'Special App Access' olduğu için kullanıcıyı manuel yönlendirmek rasyoneldir.
        // LLM 'Failed to load model' hatası veriyorsa burası hayatidir.
        console.log("[App] Android 11+ detected. Ensure 'All Files Access' is granted in settings.");
        requestAllFilesAccess();
      }
    };
    handleSpecialPermissions();
  }, []);

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
