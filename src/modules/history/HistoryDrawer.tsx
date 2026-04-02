import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'; // TouchableOpacity EKLENDİ
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import { MeetingModel } from '../../database/MeetingModel';

const HistoryList = ({ meetings, onSelect }: { meetings: MeetingModel[], onSelect: (m: MeetingModel) => void }) => {
    return (
        <FlatList
            data={meetings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
                <TouchableOpacity onPress={() => onSelect(item)} style={styles.card}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.date}>
                        {new Date(item.createdAt).toLocaleString('tr-TR', { 
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                    </Text>
                </TouchableOpacity>
            )}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Kayıt yok.</Text>
            }
        />
    );
};

const enhance = withObservables([], () => ({
    meetings: database.collections
        .get<MeetingModel>('meetings')
        .query(Q.sortBy('created_at', Q.desc))
        .observe()
}));

const EnhancedHistoryList = enhance(HistoryList);

export const HistoryDrawer = ({ onSelectMeeting }: { onSelectMeeting: (m: MeetingModel) => void }) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📂 Geçmiş</Text>
            </View>
            <EnhancedHistoryList onSelect={onSelectMeeting} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    listContainer: { padding: 15 },
    card: { 
        backgroundColor: '#222', padding: 15, borderRadius: 8, 
        marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#00C851' 
    },
    title: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    date: { color: '#888', fontSize: 12 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 20 }
});
