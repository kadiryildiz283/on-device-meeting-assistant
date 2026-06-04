import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../core/theme/Theme';
import { GlassCard } from '../../components/GlassCard';
import { orchestrator } from './BufferOrchestrator';

export const MeetingScreen = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
    // Core States
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pipelineStatus, setPipelineStatus] = useState<string>('SİSTEM BEKLEMEDE');
    const [finalSummary, setFinalSummary] = useState<string | null>(null);

    useEffect(() => {
        orchestrator.onStatusChange = (status: string) => {
            switch (status) {
                case 'recording':
                    setPipelineStatus('KAYDEDİLİYOR...');
                    break;
                case 'processing_audio':
                    setPipelineStatus('SES DOSYASI HAZIRLANIYOR...');
                    break;
                case 'idle':
                    setPipelineStatus('SİSTEM BEKLEMEDE');
                    break;
                default:
                    setPipelineStatus(status.toUpperCase());
            }
        };

        return () => {
            orchestrator.onStatusChange = null;
        };
    }, []);

    const handleToggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);
            setFinalSummary(null);
            
            const result = await orchestrator.stopMeetingAndProcess();
            Alert.alert("Bilgi", "Kayıt tamamlandı. Sunucuya yükleme ve analiz işlemi arka planda devam edecek.");
            
            setPipelineStatus('SİSTEM BEKLEMEDE');
            setIsProcessing(false);
        } else {
            setIsRecording(true);
            setFinalSummary(null);
            await orchestrator.startMeeting();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenMenu} style={styles.iconButton}><Text style={styles.iconText}>☰</Text></TouchableOpacity>
                <Text style={styles.title}>ConferenceAi</Text>
                <View style={{ width: 40 }} /> 
            </View>

            {/* SERVER INFO */}
            <View style={styles.serverBar}>
                <Text style={styles.serverText}>Sunucu: <Text style={styles.serverHighlight}>172.16.10.141</Text></Text>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={styles.mainContent}>
                {finalSummary ? (
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>SONUÇ</Text>
                        </View>
                        <ScrollView style={styles.summaryScroll} contentContainerStyle={{ padding: 16 }}>
                            <Text style={styles.summaryText}>{finalSummary}</Text>
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.statusContainer}>
                        {isRecording ? (
                            <View style={[styles.statusDot, styles.dotRecording]} />
                        ) : isProcessing ? (
                            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginBottom: 16 }} />
                        ) : (
                            <View style={[styles.statusDot, styles.dotIdle]} />
                        )}
                        <Text style={[styles.statusText, isRecording && styles.textRecording]}>{pipelineStatus}</Text>
                        
                        {!isRecording && !isProcessing && (
                            <Text style={styles.idleSubText}>
                                Toplantıyı kaydetmeye başlamak için butona basın. 
                                Kayıt bittiğinde veriler otomatik olarak sunucuya gönderilecek ve analiz edilecektir.
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {/* FOOTER ACTION BUTTON */}
            <View style={styles.footer}>
                <GlassCard 
                    onPress={isProcessing ? undefined : handleToggleRecording} 
                    style={[styles.actionButton, isRecording ? styles.stopButton : styles.startButton, isProcessing && { opacity: 0.5 }] as any}
                >
                    <Text style={[styles.actionText, isRecording ? styles.stopText : styles.startText]}>
                        {isRecording ? "KAYDI BİTİR" : "TOPLANTIYI BAŞLAT"}
                    </Text>
                </GlassCard>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 40, marginBottom: 8 },
    iconButton: { padding: 8 }, iconText: { fontSize: 24, color: Theme.colors.text },
    title: { fontSize: 22, fontWeight: '700', color: Theme.colors.text, letterSpacing: 0.5 },
    serverBar: { paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
    serverText: { fontSize: 12, color: Theme.colors.textMuted, letterSpacing: 1 }, serverHighlight: { color: Theme.colors.primary, fontWeight: '700' },
    mainContent: { flex: 1, marginHorizontal: 24, marginBottom: 24 },
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.glassSurface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, padding: 24 },
    statusDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 16 },
    dotRecording: { backgroundColor: Theme.colors.error },
    dotIdle: { backgroundColor: Theme.colors.glassBorder },
    statusText: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, letterSpacing: 1, textAlign: 'center' },
    textRecording: { color: Theme.colors.error },
    idleSubText: { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 20 },
    summaryContainer: { flex: 1, backgroundColor: Theme.colors.glassSurface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, overflow: 'hidden' },
    summaryHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.glassBorder, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center' },
    summaryTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.primary, letterSpacing: 2 },
    summaryScroll: { flex: 1 },
    summaryText: { fontSize: 14, lineHeight: 24, color: Theme.colors.text, fontWeight: '400' },
    footer: { paddingHorizontal: 24, paddingBottom: 32 }, 
    actionButton: { alignItems: 'center', paddingVertical: 18, borderRadius: Theme.radius.lg, borderWidth: 1 }, 
    actionText: { fontWeight: '700', letterSpacing: 1 },
    startButton: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }, 
    startText: { color: Theme.colors.primary, fontWeight: '700', letterSpacing: 1 }, 
    stopButton: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)' }, 
    stopText: { color: Theme.colors.error, fontWeight: '700', letterSpacing: 1 }
});
