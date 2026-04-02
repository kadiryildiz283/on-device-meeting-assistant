import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { MeetingModel } from '../../database/MeetingModel';
import { TranscriptModel } from '../../database/TranscriptModel';

interface Props {
    meeting: MeetingModel;
    transcripts: TranscriptModel[];
    onBack: () => void;
}

const DetailView = ({ meeting, transcripts, onBack }: Props) => {
    const fullText = transcripts.map(t => t.text).join(' ');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Geri</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{meeting.title}</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Tarih:</Text>
                    <Text style={styles.infoValue}>
                        {new Date(meeting.createdAt).toLocaleString('tr-TR')}
                    </Text>
                </View>

                {meeting.summary ? (
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryTitle}>✨ AI Özeti</Text>
                        <Text style={styles.summaryText}>{meeting.summary}</Text>
                    </View>
                ) : null}

                <Text style={styles.transcriptLabel}>Toplantı Dökümü</Text>
                <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptText}>
                        {fullText || "Bu toplantı için henüz bir metin kaydı yok."}
                    </Text>
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const enhance = withObservables(['meeting'], ({ meeting }: { meeting: MeetingModel }) => ({
    meeting: meeting.observe(),
    transcripts: meeting.transcripts.observe()
}));

export const MeetingDetailScreen = enhance(DetailView);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { 
        flexDirection: 'row', alignItems: 'center', padding: 15, 
        borderBottomWidth: 1, borderBottomColor: '#222' 
    },
    backBtn: { padding: 10, backgroundColor: '#222', borderRadius: 8, marginRight: 15 },
    backBtnText: { color: '#fff', fontWeight: 'bold' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
    content: { flex: 1, padding: 20 },
    infoBox: { marginBottom: 20, flexDirection: 'row' },
    infoLabel: { color: '#888', marginRight: 10 },
    infoValue: { color: '#ccc' },
    summaryBox: { 
        backgroundColor: '#1a1a2e', padding: 15, borderRadius: 12, 
        marginBottom: 25, borderWidth: 1, borderColor: '#30305a' 
    },
    summaryTitle: { color: '#4cc9f0', fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
    summaryText: { color: '#fff', lineHeight: 22 },
    transcriptLabel: { color: '#888', marginBottom: 10, fontSize: 14, fontWeight: 'bold' },
    transcriptBox: { backgroundColor: '#111', padding: 15, borderRadius: 10 },
    transcriptText: { color: '#fff', fontSize: 16, lineHeight: 26 }
});
