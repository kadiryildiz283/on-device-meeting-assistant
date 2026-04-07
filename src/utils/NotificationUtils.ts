import notifee, { AndroidImportance } from '@notifee/react-native';

export const sendSystemNotification = async (title: string, body: string) => {
    try {
        // İzinleri Notifee üzerinden tekrar doğrula (Android 13+ için ekstra güvenlik)
        await notifee.requestPermission();

        // High Importance kullanarak bildirimin sesli/titreşimli ve üstte (Heads-up) çıkmasını zorla
        const channelId = await notifee.createChannel({
            id: 'conference_ai_alerts',
            name: 'Conference AI Sistem Bildirimleri',
            importance: AndroidImportance.HIGH,
            vibration: true
        });

        // Bildirimi fırlat
        await notifee.displayNotification({
            title,
            body,
            android: {
                channelId,
                smallIcon: 'ic_launcher', // Manifest'te tanımlı simge (genelde mipmap/ic_launcher)
                color: '#6366f1',
                pressAction: {
                    id: 'default', // Bildirime tıklayınca uygulamayı açar
                },
            },
        });
        
        console.log(`[Notification] Gönderildi: ${title}`);
    } catch (error) {
        console.error("[Notification] Gönderim Hatası:", error);
    }
};
