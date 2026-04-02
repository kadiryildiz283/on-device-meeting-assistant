import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, PermissionsAndroid, ScrollView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orchestrator } from './BufferOrchestrator';

export const MeetingScreen = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("Sesi dinlemek için 'Toplantıyı Başlat' butonuna basın...");

    useEffect(() => {
        orchestrator.onTranscriptionUpdate = (text: string) => { setTranscript(text); };
        return () => { orchestrator.onTranscriptionUpdate = null; };
    }, []);

    const requestMicrophonePermission = async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            return false;
        }
    };

    const toggleMeeting = async () => {
        if (isRecording) {
            await orchestrator.stopMeeting();
            setIsRecording(false);
        } else {
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) return;
            setTranscript("Dinleniyor...\n");
            await orchestrator.startMeeting();
            setIsRecording(true);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}>
                    <Text style={styles.menuBtnText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Konferans AI</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.container}>
                <TouchableOpacity 
                    onPress={toggleMeeting}
                    style={[styles.recordBtn, { backgroundColor: isRecording ? '#ff4444' : '#00C851' }]}
                >
                    <Text style={styles.recordBtnText}>
                        {isRecording ? "🔴 Kaydı Durdur" : "🎙️ Toplantıyı Başlat"}
                    </Text>
                </TouchableOpacity>

                <ScrollView style={styles.transcriptContainer}>
                    <Text style={styles.transcriptText}>{transcript}</Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222'
    },
    menuBtn: { padding: 10 },
    menuBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    container: { padding: 20, flex: 1 },
    recordBtn: { padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    recordBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    transcriptContainer: { flex: 1, backgroundColor: '#111', padding: 15, borderRadius: 10 },
    transcriptText: { color: '#fff', fontSize: 16, lineHeight: 24 }
});
