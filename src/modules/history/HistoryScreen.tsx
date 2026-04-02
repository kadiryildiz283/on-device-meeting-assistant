import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import { MeetingModel } from '../../database/MeetingModel';

// --- 1. The Presentation Component ---
const HistoryList = ({ meetings }: { meetings: MeetingModel[] }) => {
    return (
        <FlatList
            data={meetings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.date}>
                        {new Date(item.createdAt).toLocaleString('tr-TR', { 
                            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' 
                        })}
                    </Text>
                    {item.summary && <Text style={styles.summary}>{item.summary}</Text>}
                </View>
            )}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Henüz kaydedilmiş bir toplantı bulunmuyor.</Text>
            }
        />
    );
};

// --- 2. The Reactive HOC (Higher Order Component) ---
// Bu blok, meetings tablosunu dinler ve yeni kayıt eklendiğinde UI'ı anında günceller.
const enhance = withObservables([], () => ({
    meetings: database.collections
        .get<MeetingModel>('meetings')
        .query(Q.sortBy('created_at', Q.desc))
        .observe()
}));

const EnhancedHistoryList = enhance(HistoryList);

// --- 3. The Main Screen ---
export const HistoryScreen = ({ onClose }: { onClose: () => void }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📂 Geçmiş Toplantılar</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>Kapat</Text>
                </TouchableOpacity>
            </View>
            <EnhancedHistoryList />
        </View>
    );
};

// --- Styles (Dark Mode Optimized) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' 
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    closeBtn: { padding: 8, backgroundColor: '#333', borderRadius: 8 },
    closeBtnText: { color: '#fff', fontWeight: 'bold' },
    listContainer: { padding: 15 },
    card: { 
        backgroundColor: '#111', padding: 15, borderRadius: 10, 
        marginBottom: 15, borderWidth: 1, borderColor: '#222' 
    },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    date: { color: '#888', fontSize: 12, marginBottom: 10 },
    summary: { color: '#ccc', fontSize: 14, fontStyle: 'italic' },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 50, fontSize: 16 }
});
