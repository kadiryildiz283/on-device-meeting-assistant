import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    Modal,
    Alert,
    ScrollView,
    PermissionsAndroid,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import BackgroundService from 'react-native-background-actions';
import notifee from '@notifee/react-native';
import { Theme } from '../../core/theme/Theme';
import { GlassCard } from '../../components/GlassCard';
import { orchestrator } from './BufferOrchestrator';
import type { WhisperModelType } from '../../services/WhisperService';

type LLMType = '1.5B' | '3B' | '7B';

const LLM_REGISTRY: Record<LLMType, { filename: string; url: string; size: string }> = {
    '1.5B': { filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf', url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true', size: '1.1 GB' },
    '3B': { filename: 'qwen2.5-3b-instruct-q4_k_m.gguf', url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true', size: '2.2 GB' },
    '7B': { filename: 'qwen2.5-7b-instruct-q4_k_m.gguf', url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true', size: '4.7 GB' }
};

const WHISPER_LARGE_FILENAME = 'ggml-large-v3-q5_0.bin';
const WHISPER_LARGE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin?download=true';

export const MeetingScreen = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
    // Core States
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pipelineStatus, setPipelineStatus] = useState<string>('SİSTEM BEKLEMEDE');
    const [finalSummary, setFinalSummary] = useState<string | null>(null);
    
    // Config States
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [llamaType, setLlamaType] = useState<LLMType>('1.5B'); 
    const [whisperType, setWhisperType] = useState<WhisperModelType>('small');
    
    // Download States (Sadece LLM için)
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        // Orchestrator'dan gelen boru hattı (pipeline) durumlarını dinle ve Türkçeleştir
        orchestrator.onStatusChange = (status: string) => {
            switch (status) {
                case 'recording':
                    setPipelineStatus('KAYDEDİLİYOR...');
                    break;
                case 'processing_audio':
                    setPipelineStatus('SES DOSYASI İŞLENİYOR...');
                    break;
                case 'transcribing':
                    setPipelineStatus('SES METNE ÇEVRİLİYOR (STT)...');
                    break;
                case 'summarizing':
                    setPipelineStatus('YAPAY ZEKA ANALİZ EDİYOR (LLM)...');
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

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const permissions = [
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ];

                // Android 13+ için bildirim izni
                if (Platform.Version >= 33) {
                    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                }

                const grants = await PermissionsAndroid.requestMultiple(permissions);
                return grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const getLlamaPath = async (type: LLMType): Promise<string> => {
        const docPath = `${RNFS.DocumentDirectoryPath}/${LLM_REGISTRY[type].filename}`;
        if (type === '7B') {
            const manualPath = '/storage/emulated/0/Download/qwen2.5-7b-instruct-q4_k_m.gguf';
            const manualExists = await RNFS.exists(manualPath);
            if (manualExists) return manualPath;
        }
        return docPath;
    };

    const sendNotification = async (title: string, body: string) => {
        await notifee.requestPermission();
        const channelId = await notifee.createChannel({ id: 'default', name: 'Sistem Bildirimleri' });
        await notifee.displayNotification({ title, body, android: { channelId } });
    };

    const downloadModel = async (path: string, url: string, modelName: string) => {
        Alert.alert("Bilgi", "İndirme işlemi arka planda devam edecektir. İşlem bitince bildirim göndereceğiz.");
        setIsDownloading(true);

        if (BackgroundService.isRunning()) {
            await BackgroundService.stop();
        }

        const downloadTask = async (taskDataArguments?: any) => {
            return new Promise<void>((resolve) => {
                const options: RNFS.DownloadFileOptions = {
                    fromUrl: url,
                    toFile: path,
                    background: true,
                    progress: (res) => {
                        const progress = Math.round((res.bytesWritten / res.contentLength) * 100);
                        setDownloadProgress(progress);
                        BackgroundService.updateNotification({ taskDesc: `%${progress} tamamlandı...` });
                    },
                };

                RNFS.downloadFile(options).promise.then(async (result) => {
                    if (result.statusCode === 200 && result.bytesWritten > 1000000) {
                        await sendNotification("İndirme Tamamlandı", `${modelName} modeli başarıyla yüklendi.`);
                    } else {
                        if (await RNFS.exists(path)) await RNFS.unlink(path);
                        await sendNotification("İndirme Hatası", `${modelName} indirilemedi.`);
                    }
                }).catch(async () => {
                    if (await RNFS.exists(path)) await RNFS.unlink(path); 
                    await sendNotification("İndirme Hatası", `${modelName} indirilemedi.`);
                }).finally(async () => {
                    setIsDownloading(false);
                    setDownloadProgress(0);
                    await BackgroundService.stop();
                    resolve();
                });
            });
        };

        await BackgroundService.start(downloadTask, {
            taskName: 'ModelDownload',
            taskTitle: `${modelName} İndiriliyor`,
            taskDesc: 'İndirme başlatılıyor...',
            taskIcon: { name: 'ic_launcher', type: 'mipmap' },
            color: '#6366f1',
            parameters: { delay: 1000 }
        });
    };

    const handleApplySettings = async () => {
        const llamaPath = await getLlamaPath(llamaType);
        const llamaExists = await RNFS.exists(llamaPath);
        
        if (!llamaExists) {
            Alert.alert("Eksik LLM", `Seçilen ${llamaType} LLM bulunamadı. İndirilsin mi?`, [
                { text: "İptal", style: "cancel" },
                { text: "İndir", onPress: () => downloadModel(llamaPath, LLM_REGISTRY[llamaType].url, `${llamaType} LLM`) }
            ]);
            return;
        }

        if (whisperType === 'large') {
            const whisperPath = `${RNFS.DocumentDirectoryPath}/${WHISPER_LARGE_FILENAME}`;
            const whisperExists = await RNFS.exists(whisperPath);
            
            if (!whisperExists) {
                Alert.alert("Eksik STT", `Seçilen Large Whisper modeli bulunamadı. İndirilsin mi?`, [
                    { text: "İptal", style: "cancel" },
                    { text: "İndir", onPress: () => downloadModel(whisperPath, WHISPER_LARGE_URL, 'Large Whisper') }
                ]);
                return;
            }
        }

        orchestrator.setPreferences(llamaPath, whisperType);
        setSettingsVisible(false);
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            // STOP RECORDING & START BATCH PROCESSING
            Alert.alert("Bilgi", "Ses analizi arka planda devam edecektir. İşlem bitince bildirim göndereceğiz.");
            setIsRecording(false);
            setIsProcessing(true);
            setFinalSummary(null); // Clear previous summary
            
            const summaryResult = await orchestrator.stopMeetingAndProcess();
            
            setFinalSummary(summaryResult);
            setIsProcessing(false);
        } else {
            // START RECORDING
            const hasPerms = await requestPermissions();
            if (!hasPerms) {
                Alert.alert("İzin Hatası", "Mikrofon izni olmadan toplantı kaydedilemez.");
                return;
            }

            const llamaPath = await getLlamaPath(llamaType);
            const llamaExists = await RNFS.exists(llamaPath);
            
            let whisperExists = true;
            if (whisperType === 'large') {
                whisperExists = await RNFS.exists(`${RNFS.DocumentDirectoryPath}/${WHISPER_LARGE_FILENAME}`);
            }
            
            if (!llamaExists || !whisperExists) {
                setSettingsVisible(true);
                return;
            }

            setFinalSummary(null);
            setIsRecording(true);
            
            orchestrator.setPreferences(llamaPath, whisperType);
            await orchestrator.startMeeting();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenMenu} style={styles.iconButton}><Text style={styles.iconText}>☰</Text></TouchableOpacity>
                <Text style={styles.title}>ConferenceAi</Text>
                <TouchableOpacity onPress={() => !isRecording && !isProcessing && setSettingsVisible(true)} style={styles.iconButton}>
                    <Text style={[styles.iconText, (isRecording || isProcessing) && { opacity: 0.3 }]}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* ACTIVE CONFIG */}
            <View style={styles.activeConfigBar}>
                <Text style={styles.configText}>STT: <Text style={styles.configHighlight}>WHISPER {whisperType.toUpperCase()}</Text>  |  LLM: <Text style={styles.configHighlight}>{llamaType}</Text></Text>
            </View>

            {/* SETTINGS MODAL */}
            <Modal visible={settingsVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.settingsPanel}>
                        <Text style={styles.panelTitle}>Sistem Yapılandırması</Text>
                        
                        <Text style={styles.label}>STT Motoru (Yerel Gömülü / İndirilebilir)</Text>
                        <View style={styles.row}>
                            {(['tiny', 'small', 'large'] as WhisperModelType[]).map(t => (
                                <TouchableOpacity key={t} onPress={() => !isDownloading && setWhisperType(t)} style={[styles.chip, whisperType === t && styles.activeChip]}>
                                    <Text style={[styles.chipText, whisperType === t && styles.activeChipText]}>Whisper {t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>LLM Motoru</Text>
                        <View style={styles.row}>
                            {(['1.5B', '3B', '7B'] as LLMType[]).map(t => (
                                <TouchableOpacity key={t} onPress={() => !isDownloading && setLlamaType(t)} style={[styles.chip, llamaType === t && styles.activeChip]}>
                                    <Text style={[styles.chipText, llamaType === t && styles.activeChipText]}>{t}{'\n'}<Text style={{fontSize: 10, opacity: 0.7}}>{LLM_REGISTRY[t].size}</Text></Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {isDownloading ? (
                            <View style={styles.progressContainer}>
                                <Text style={styles.progressText}>Model İndiriliyor... {downloadProgress}%</Text>
                                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} /></View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={handleApplySettings} style={styles.applyBtn}><Text style={styles.applyText}>KONTROL ET VE UYGULA</Text></TouchableOpacity>
                        )}
                    </GlassCard>
                </View>
            </Modal>

            {/* MAIN CONTENT AREA */}
            <View style={styles.mainContent}>
                {finalSummary ? (
                    // SHOW FINAL SUMMARY
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>TOPLANTI ANALİZİ</Text>
                        </View>
                        <ScrollView style={styles.summaryScroll} contentContainerStyle={{ padding: 16 }}>
                            <Text style={styles.summaryText}>{finalSummary}</Text>
                        </ScrollView>
                    </View>
                ) : (
                    // SHOW STATUS INDICATOR
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
                            <Text style={styles.idleSubText}>Toplantıyı kaydetmeye başlamak için aşağıdaki butonu kullanın. Uygulama sesi arka planda kaydedecek ve bitiminde analiz edecektir.</Text>
                        )}
                    </View>
                )}
            </View>

            {/* FOOTER ACTION BUTTON */}
            <View style={styles.footer}>
                <GlassCard 
                    onPress={isProcessing || isDownloading ? undefined : handleToggleRecording} 
                    style={[styles.actionButton, isRecording ? styles.stopButton : styles.startButton, isProcessing && { opacity: 0.5 }]}
                >
                    {isProcessing ? (
                        <Text style={styles.processingText}>İŞLEM DEVAM EDİYOR...</Text>
                    ) : (
                        <Text style={[styles.actionText, isRecording ? styles.stopText : styles.startText]}>
                            {isRecording ? "KAYDI BİTİR VE ANALİZ ET" : "TOPLANTIYI BAŞLAT"}
                        </Text>
                    )}
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
    activeConfigBar: { paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
    configText: { fontSize: 12, color: Theme.colors.textMuted, letterSpacing: 1 }, configHighlight: { color: Theme.colors.primary, fontWeight: '700' },
    
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    settingsPanel: { padding: 24, borderRadius: Theme.radius.lg, backgroundColor: '#111' },
    panelTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24 },
    label: { color: Theme.colors.textMuted, fontSize: 12, marginBottom: 12, marginTop: 16, letterSpacing: 1 },
    row: { flexDirection: 'row', gap: 12 },
    chip: { paddingVertical: 12, borderRadius: Theme.radius.md, backgroundColor: Theme.colors.glassSurface, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.glassBorder },
    activeChip: { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: Theme.colors.primary },
    chipText: { color: Theme.colors.textMuted, fontWeight: '600', fontSize: 13, textAlign: 'center' }, activeChipText: { color: Theme.colors.primary },
    applyBtn: { marginTop: 32, backgroundColor: Theme.colors.primary, padding: 16, borderRadius: Theme.radius.md, alignItems: 'center' }, applyText: { color: '#fff', fontWeight: '700', letterSpacing: 1 },
    progressContainer: { marginTop: 32 }, progressText: { color: Theme.colors.textMuted, fontSize: 12, marginBottom: 8, textAlign: 'center' }, progressBarBg: { height: 6, backgroundColor: Theme.colors.glassBorder, borderRadius: 3, overflow: 'hidden' }, progressBarFill: { height: '100%', backgroundColor: Theme.colors.primary },
    
    // Main Content
    mainContent: { flex: 1, marginHorizontal: 24, marginBottom: 24 },
    
    // Status UI
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.glassSurface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, padding: 24 },
    statusDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 16 },
    dotRecording: { backgroundColor: Theme.colors.error, shadowColor: Theme.colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
    dotIdle: { backgroundColor: Theme.colors.glassBorder },
    statusText: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, letterSpacing: 1, textAlign: 'center' },
    textRecording: { color: Theme.colors.error },
    idleSubText: { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 20 },
    
    // Summary UI
    summaryContainer: { flex: 1, backgroundColor: Theme.colors.glassSurface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, overflow: 'hidden' },
    summaryHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.glassBorder, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center' },
    summaryTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.primary, letterSpacing: 2 },
    summaryScroll: { flex: 1 },
    summaryText: { fontSize: 14, lineHeight: 24, color: Theme.colors.text, fontWeight: '400' },
    
    // Footer
    footer: { paddingHorizontal: 24, paddingBottom: 32 }, actionButton: { alignItems: 'center', paddingVertical: 18, borderRadius: Theme.radius.lg, borderWidth: 1 }, startButton: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }, startText: { color: Theme.colors.primary, fontWeight: '700', letterSpacing: 1 }, stopButton: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)' }, stopText: { color: Theme.colors.error, fontWeight: '700', letterSpacing: 1 }, processingText: { color: Theme.colors.textMuted, fontWeight: '700', letterSpacing: 1 }
});
