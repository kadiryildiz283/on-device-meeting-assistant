import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, PermissionsAndroid, ScrollView, SafeAreaView, Platform } from 'react-native';
import { orchestrator } from './BufferOrchestrator';

export const MeetingScreen = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("Sesi dinlemek için 'Toplantıyı Başlat' butonuna basın...");

    useEffect(() => {
        // Orkestratörden gelen her yeni kelimeyi ekrana bas
        orchestrator.onTranscriptionUpdate = (text: string) => {
            setTranscript(text);
        };
    }, []);

    const requestMicrophonePermission = async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: "Mikrofon İzni",
                    message: "Toplantıları dinleyebilmek için mikrofona ihtiyacım var.",
                    buttonNeutral: "Daha Sonra",
                    buttonNegative: "İptal",
                    buttonPositive: "Tamam"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const toggleMeeting = async () => {
        if (isRecording) {
            await orchestrator.stopMeeting();
            setIsRecording(false);
        } else {
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) {
                setTranscript("Mikrofon izni verilmedi!");
                return;
            }
            setTranscript("Dinleniyor...\n");
            await orchestrator.startMeeting();
            setIsRecording(true);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ padding: 20, flex: 1 }}>
                <TouchableOpacity 
                    onPress={toggleMeeting}
                    style={{
                        backgroundColor: isRecording ? '#ff4444' : '#00C851',
                        padding: 20,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginBottom: 20
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                        {isRecording ? "🔴 Kaydı Durdur" : "🎙️ Toplantıyı Başlat"}
                    </Text>
                </TouchableOpacity>

                <ScrollView style={{ flex: 1, backgroundColor: '#111', padding: 15, borderRadius: 10 }}>
                    <Text style={{ color: '#fff', fontSize: 16, lineHeight: 24 }}>
                        {transcript}
                    </Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};
