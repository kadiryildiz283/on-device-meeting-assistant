import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    ScrollView,
    Alert,
    Platform,
    Modal,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../core/theme/Theme';
import { GlassCard } from '../../components/GlassCard';
import { orchestrator } from './BufferOrchestrator';
import { SettingsService } from '../../services/SettingsService';
import { SyncService } from '../../services/SyncService';

export const MeetingScreen = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
    // Core States
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pipelineStatus, setPipelineStatus] = useState<string>('SİSTEM BEKLEMEDE');
    const [finalSummary, setFinalSummary] = useState<string | null>(null);
    const [serverHost, setServerHost] = useState('172.16.10.142');
    const [llmModel, setLlmModel] = useState('qwen3.6:35b');
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [inputHost, setInputHost] = useState('');
    const [inputLlmModel, setInputLlmModel] = useState('');

    // Connection Status States
    const [sttStatus, setSttStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
    const [llmStatus, setLlmStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

    useEffect(() => {
        // Load settings
        SettingsService.getServerHost().then(host => {
            setServerHost(host);
            setInputHost(host);
        });

        SettingsService.getLlmModel().then(model => {
            setLlmModel(model);
            setInputLlmModel(model);
        });

        // Listen for recording/processing states
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

    // Health check pinging loop (every 5 seconds)
    useEffect(() => {
        const runHealthCheck = async () => {
            const isSttOk = await SyncService.checkSttHealth();
            const isLlmOk = await SyncService.checkLlmHealth();
            setSttStatus(isSttOk ? 'connected' : 'disconnected');
            setLlmStatus(isLlmOk ? 'connected' : 'disconnected');
        };

        runHealthCheck();
        const interval = setInterval(runHealthCheck, 5000);

        return () => clearInterval(interval);
    }, [serverHost]);

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

    const handleSaveSettings = async () => {
        if (!inputHost.trim()) {
            Alert.alert("Hata", "Sunucu adresi boş olamaz.");
            return;
        }
        if (!inputLlmModel.trim()) {
            Alert.alert("Hata", "LLM model adı boş olamaz.");
            return;
        }
        const cleanHost = inputHost.trim();
        const cleanLlmModel = inputLlmModel.trim();
        
        await SettingsService.setServerHost(cleanHost);
        await SettingsService.setLlmModel(cleanLlmModel);
        
        setServerHost(cleanHost);
        setLlmModel(cleanLlmModel);
        
        setIsSettingsVisible(false);
        setSttStatus('checking');
        setLlmStatus('checking');
        Alert.alert("Başarılı", `Yapılandırma kaydedildi:\nSunucu IP: ${cleanHost}\nLLM Model: ${cleanLlmModel}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenMenu} style={styles.iconButton}><Text style={styles.iconText}>☰</Text></TouchableOpacity>
                <Text style={styles.title}>ConferenceAi</Text>
                <View style={{ width: 40 }} /> 
            </View>

            {/* SERVER INFO & HEALTH BAR */}
            <TouchableOpacity 
                style={styles.serverBar} 
                onPress={() => {
                    setInputHost(serverHost);
                    setInputLlmModel(llmModel);
                    setIsSettingsVisible(true);
                }}
            >
                <View style={styles.serverRow}>
                    <Text style={styles.serverText}>Sunucu: <Text style={styles.serverHighlight}>{serverHost}</Text> ⚙️</Text>
                </View>
                
                {/* Health pills */}
                <View style={styles.statusBadgeRow}>
                    <View style={styles.statusPill}>
                        <View style={[
                            styles.statusDotSmall, 
                            sttStatus === 'connected' ? styles.dotGreen : 
                            sttStatus === 'disconnected' ? styles.dotRed : styles.dotGray
                        ]} />
                        <Text style={styles.statusBadgeText}>
                            STT (Whisper): {sttStatus === 'connected' ? 'BAĞLI' : sttStatus === 'disconnected' ? 'BAĞLANTI YOK' : 'KONTROL EDİLİYOR'}
                        </Text>
                    </View>
                    
                    <View style={styles.statusPill}>
                        <View style={[
                            styles.statusDotSmall, 
                            llmStatus === 'connected' ? styles.dotGreen : 
                            llmStatus === 'disconnected' ? styles.dotRed : styles.dotGray
                        ]} />
                        <Text style={styles.statusBadgeText}>
                            LLM (Ollama): {llmStatus === 'connected' ? 'BAĞLI' : llmStatus === 'disconnected' ? 'BAĞLANTI YOK' : 'KONTROL EDİLİYOR'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* SETTINGS MODAL */}
            <Modal
                visible={isSettingsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsSettingsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Sunucu Yapılandırması</Text>
                        
                        <Text style={styles.inputLabel}>Sunucu Adresi / IP:</Text>
                        <TextInput
                            style={styles.textInput}
                            value={inputHost}
                            onChangeText={setInputHost}
                            placeholder="Örn: 192.168.1.50 veya 10.0.2.2"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={styles.inputLabel}>Ollama Model Adı:</Text>
                        <TextInput
                            style={styles.textInput}
                            value={inputLlmModel}
                            onChangeText={setInputLlmModel}
                            placeholder="Örn: qwen2.5:latest veya llama3"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={styles.modalNote}>
                            * Android Emulator için "10.0.2.2" kullanın.{"\n"}
                            * Portlar varsayılan olarak STT için 8080, LLM için 11434 olarak yapılandırılmıştır.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelBtn]} 
                                onPress={() => setIsSettingsVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>İPTAL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveBtn]} 
                                onPress={handleSaveSettings}
                            >
                                <Text style={styles.saveBtnText}>KAYDET</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    serverBar: { paddingHorizontal: 24, marginBottom: 20, alignItems: 'center', width: '100%' },
    serverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    serverText: { fontSize: 12, color: Theme.colors.textMuted, letterSpacing: 1 }, serverHighlight: { color: Theme.colors.primary, fontWeight: '700' },
    statusBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 8, paddingHorizontal: 12 },
    statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
    statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
    dotGreen: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
    dotRed: { backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
    dotGray: { backgroundColor: '#6b7280' },
    statusBadgeText: { fontSize: 9, fontWeight: '600', color: Theme.colors.textMuted, letterSpacing: 0.5 },
    inputLabel: { fontSize: 12, color: Theme.colors.textMuted, alignSelf: 'flex-start', marginBottom: 6, marginTop: 10, fontWeight: '600' },
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
    stopText: { color: Theme.colors.error, fontWeight: '700', letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', backgroundColor: '#121212', borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, padding: 24, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.colors.text, marginBottom: 12, letterSpacing: 0.5 },
    modalSubtitle: { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    textInput: { width: '100%', backgroundColor: '#1e1e1e', borderRadius: Theme.radius.md, borderWidth: 1, borderColor: Theme.colors.glassBorder, paddingHorizontal: 16, paddingVertical: 12, color: Theme.colors.text, fontSize: 15, marginBottom: 12, textAlign: 'center' },
    modalNote: { fontSize: 11, color: Theme.colors.textMuted, lineHeight: 16, marginBottom: 24, width: '100%', textAlign: 'left' },
    modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalButton: { flex: 0.48, paddingVertical: 14, borderRadius: Theme.radius.md, alignItems: 'center', borderWidth: 1 },
    cancelBtn: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: Theme.colors.glassBorder },
    cancelBtnText: { color: Theme.colors.textMuted, fontWeight: '700', letterSpacing: 1, fontSize: 12 },
    saveBtn: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
    saveBtnText: { color: '#fff', fontWeight: '700', letterSpacing: 1, fontSize: 12 }
});

