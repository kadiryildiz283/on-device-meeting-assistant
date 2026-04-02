import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    Modal,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import { Theme } from '../../core/theme/Theme';
import { GlassCard } from '../../components/GlassCard';
import { orchestrator } from './BufferOrchestrator';

type STTType = 'tiny' | 'small';
type LLMType = '1.5B' | '3B' | '7B';

const LLM_REGISTRY: Record<LLMType, { filename: string; url: string; size: string }> = {
    '1.5B': {
        filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
        url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true',
        size: '1.1 GB'
    },
    '3B': {
        filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
        url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true',
        size: '2.2 GB'
    },
    '7B': {
        filename: 'qwen2.5-7b-instruct-q4_k_m.gguf',
        url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true',
        size: '4.7 GB'
    }
};

interface TranscriptItem { id: string; time: string; text: string; }

export const MeetingScreen = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcriptFeed, setTranscriptFeed] = useState<TranscriptItem[]>([]);
    
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [llamaType, setLlamaType] = useState<LLMType>('1.5B'); 
    const [sttType, setSttType] = useState<STTType>('tiny');
    
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const lastProcessedLength = useRef(0);

    useEffect(() => {
        orchestrator.onTranscriptionUpdate = (fullText: string) => {
            const now = new Date();
            const blockId = Math.floor(now.getTime() / (5 * 60 * 1000)).toString();
            const timeString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            setTranscriptFeed(prev => {
                if (prev.length === 0) {
                    lastProcessedLength.current = 0;
                    return [{ id: blockId, time: timeString, text: fullText }];
                }
                const lastItem = prev[prev.length - 1];
                if (lastItem.id === blockId) {
                    const currentBlockText = fullText.slice(lastProcessedLength.current);
                    const updatedList = [...prev];
                    updatedList[updatedList.length - 1] = { ...lastItem, text: currentBlockText };
                    return updatedList;
                } else {
                    lastProcessedLength.current = fullText.length;
                    const newBlockText = fullText.slice(lastProcessedLength.current);
                    return [...prev, { id: blockId, time: timeString, text: newBlockText }];
                }
            });
        };

        orchestrator.onStatusChange = (status: string) => {
            if (status === 'processing') setIsProcessing(true);
        };

        return () => {
            orchestrator.onTranscriptionUpdate = null;
            orchestrator.onStatusChange = null;
        };
    }, []);

    /**
     * Akıllı Yol Bulucu (Path Finder)
     * Eğer kullanıcı 7B'yi daha önce manuel olarak Download klasörüne attıysa onu kullanır.
     * Yoksa uygulamanın kendi güvenli dizinini (DocumentDirectoryPath) gösterir.
     */
    const getLlamaPath = async (type: LLMType): Promise<string> => {
        const docPath = `${RNFS.DocumentDirectoryPath}/${LLM_REGISTRY[type].filename}`;
        
        if (type === '7B') {
            const manualPath = '/storage/emulated/0/Download/qwen2.5-7b-instruct-q4_k_m.gguf';
            const manualExists = await RNFS.exists(manualPath);
            if (manualExists) return manualPath;
        }
        
        return docPath;
    };

    /**
     * İndirme işlemini başlatan ana motor.
     */
    const startDownloadProcess = (path: string, type: LLMType) => {
        setIsDownloading(true);
        setDownloadProgress(0);
        setSettingsVisible(true); // İndirme çubuğunu göstermek için paneli açık tut

        const options: RNFS.DownloadFileOptions = {
            fromUrl: LLM_REGISTRY[type].url,
            toFile: path,
            background: true,
            progressDivider: 2,
            progress: (res) => {
                setDownloadProgress(Math.round((res.bytesWritten / res.contentLength) * 100));
            },
        };

        RNFS.downloadFile(options).promise.then((result) => {
            if (result.statusCode === 200) {
                orchestrator.setPreferences(sttType, path);
                setTimeout(() => { 
                    setIsDownloading(false); 
                    setSettingsVisible(false); 
                    Alert.alert("Başarılı", `${type} modeli cihaza yüklendi.`);
                }, 500);
            } else {
                throw new Error("İndirme sunucu tarafından reddedildi.");
            }
        }).catch(async (error) => {
            setIsDownloading(false);
            Alert.alert("İndirme Hatası", "Model indirilemedi. Bağlantınızı kontrol edin.");
            if (await RNFS.exists(path)) await RNFS.unlink(path); // Bozuk dosyayı sil
        });
    };

    /**
     * Model yoksa kullanıcıya soran Geçit (Gatekeeper) fonksiyonu.
     */
    const askForDownload = (path: string, type: LLMType) => {
        Alert.alert(
            "Yerel Model Bulunamadı",
            `Seçtiğiniz ${type} modeli cihazınızda yüklü değil.\nİndirme Boyutu: ${LLM_REGISTRY[type].size}\n\nŞimdi indirmek ister misiniz?`,
            [
                { text: "İptal", style: "cancel" },
                { text: "İndirmeyi Başlat", onPress: () => startDownloadProcess(path, type) }
            ]
        );
    };

    const handleApplySettings = async () => {
        const path = await getLlamaPath(llamaType);
        const exists = await RNFS.exists(path);

        if (exists) {
            orchestrator.setPreferences(sttType, path);
            setSettingsVisible(false);
        } else {
            // VETO: Direk indirme! Önce kullanıcıya sor.
            askForDownload(path, llamaType);
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);
            const summary = await orchestrator.stopMeeting();
            console.log("[MeetingScreen] AI Analizi Tamamlandı:\n", summary);
            setIsProcessing(false);
            setTranscriptFeed([]); 
        } else {
            // 1. Başlamadan önce modeli kontrol et
            const path = await getLlamaPath(llamaType);
            const exists = await RNFS.exists(path);
            
            // 2. Model yoksa dur ve sor
            if (!exists) {
                askForDownload(path, llamaType);
                return; // Toplantıyı başlatmayı İPTAL ET
            }

            // 3. Model varsa sorunsuz başlat
            setIsRecording(true);
            setTranscriptFeed([]); 
            lastProcessedLength.current = 0; 

            orchestrator.setPreferences(sttType, path);
            await orchestrator.startMeeting();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onOpenMenu} style={styles.iconButton}><Text style={styles.iconText}>☰</Text></TouchableOpacity>
                <Text style={styles.title}>ConferenceAi</Text>
                <TouchableOpacity onPress={() => !isRecording && setSettingsVisible(true)} style={styles.iconButton}><Text style={[styles.iconText, isRecording && { opacity: 0.3 }]}>⚙️</Text></TouchableOpacity>
            </View>

            <View style={styles.activeConfigBar}>
                <Text style={styles.configText}>STT: <Text style={styles.configHighlight}>{sttType.toUpperCase()}</Text>  |  LLM: <Text style={styles.configHighlight}>{llamaType}</Text></Text>
            </View>

            <Modal visible={settingsVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.settingsPanel}>
                        <Text style={styles.panelTitle}>Sistem Yapılandırması</Text>
                        
                        <Text style={styles.label}>STT Motoru (Yerel Ses Çözümleme)</Text>
                        <View style={styles.row}>
                            {(['tiny', 'small'] as STTType[]).map(t => (
                                <TouchableOpacity key={t} onPress={() => !isDownloading && setSttType(t)} style={[styles.chip, sttType === t && styles.activeChip]}>
                                    <Text style={[styles.chipText, sttType === t && styles.activeChipText]}>{t.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>LLM Motoru (Yerel Yapay Zeka)</Text>
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
                            <TouchableOpacity onPress={handleApplySettings} style={styles.applyBtn}><Text style={styles.applyText}>UYGULA VE KAPAT</Text></TouchableOpacity>
                        )}
                    </GlassCard>
                </View>
            </Modal>

            <View style={styles.feedContainer}>
                <View style={styles.feedHeader}>
                    {isRecording ? <View style={styles.recordingDot} /> : null}
                    <Text style={styles.feedTitle}>{isProcessing ? "YAPAY ZEKA ANALİZ EDİYOR..." : isRecording ? "CANLI LOG AKIŞI" : "SİSTEM BEKLEMEDE"}</Text>
                </View>
                {transcriptFeed.length === 0 && !isRecording && !isProcessing && (
                    <View style={styles.emptyFeed}><Text style={styles.emptyText}>Dökümü başlatmak için aşağıdaki butonu kullanın.</Text></View>
                )}
                <FlatList data={transcriptFeed} keyExtractor={item => item.id} renderItem={({ item }) => (
                    <View style={styles.logRow}><Text style={styles.timestamp}>[{item.time}]</Text><Text style={styles.logText}>{item.text}</Text></View>
                )} contentContainerStyle={styles.feedList} showsVerticalScrollIndicator={true} />
            </View>

            <View style={styles.footer}>
                <GlassCard onPress={isProcessing || isDownloading ? undefined : handleToggleRecording} style={[styles.actionButton, isRecording ? styles.stopButton : styles.startButton]}>
                    {isProcessing ? <ActivityIndicator color={Theme.colors.primary} size="large" /> : <Text style={[styles.actionText, isRecording ? styles.stopText : styles.startText]}>{isRecording ? "TOPLANTIYI BİTİR VE ANALİZ ET" : "TOPLANTIYI BAŞLAT"}</Text>}
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
    feedContainer: { flex: 1, marginHorizontal: 24, marginBottom: 24, backgroundColor: Theme.colors.glassSurface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.glassBorder, overflow: 'hidden' },
    feedHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.glassBorder, backgroundColor: 'rgba(0,0,0,0.4)' },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.error, marginRight: 8 }, feedTitle: { fontSize: 11, fontWeight: '700', color: Theme.colors.textMuted, letterSpacing: 1.5 },
    feedList: { padding: 16 }, emptyFeed: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, emptyText: { color: Theme.colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 22 },
    logRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }, timestamp: { fontSize: 12, fontFamily: 'monospace', color: Theme.colors.textMuted, marginRight: 8, marginTop: 2 }, logText: { flex: 1, fontSize: 14, lineHeight: 20, color: Theme.colors.text, fontWeight: '400' },
    footer: { paddingHorizontal: 24, paddingBottom: 32 }, actionButton: { alignItems: 'center', paddingVertical: 18, borderRadius: Theme.radius.lg, borderWidth: 1 }, startButton: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }, startText: { color: Theme.colors.primary, fontWeight: '700', letterSpacing: 1 }, stopButton: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)' }, stopText: { color: Theme.colors.error, fontWeight: '700', letterSpacing: 1 }
});
