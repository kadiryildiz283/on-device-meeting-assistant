import { database } from './index';
import { MeetingModel } from './MeetingModel';
import { TranscriptModel } from './TranscriptModel';

export class MeetingController {
    /**
     * Creates a new meeting record in the database.
     */
    static async createMeeting(title: string): Promise<MeetingModel> {
        let meeting: MeetingModel;
        await database.write(async () => {
            meeting = await database.get<MeetingModel>('meetings').create(record => {
                record.title = title;
                record.createdAt = new Date();
                record.status = 'recording';
            });
        });
        console.log(`[DB] Created new meeting: ${meeting!.id}`);
        return meeting!;
    }

    static async updateStatus(meeting: MeetingModel, status: string): Promise<void> {
        await database.write(async () => {
            await meeting.update(record => {
                record.status = status;
            });
        });
        console.log(`[DB] Updated status to ${status} for meeting: ${meeting.id}`);
    }

    static async updateAudioFilePath(meeting: MeetingModel, path: string): Promise<void> {
        await database.write(async () => {
            await meeting.update(record => {
                record.audioFilePath = path;
            });
        });
        console.log(`[DB] Updated audio path for meeting: ${meeting.id}`);
    }

    static async getPendingMeetings(): Promise<MeetingModel[]> {
        return await database.get<MeetingModel>('meetings').query().fetch();
        // WatermelonDB'de status bazlı filtreleme yapmak için:
        // return await database.get<MeetingModel>('meetings').query(Q.where('status', Q.oneOf(['pending', 'failed']))).fetch();
        // Şimdilik basitçe tümünü çekip kod tarafında filtreleyeceğiz ya da Q importu gerekecek.
    }
    /**
     * Updates the summary of an existing meeting.
     * Appends the new summary block if a summary already exists.
     */
    static async updateSummary(meeting: MeetingModel, newSummary: string): Promise<void> {
        await database.write(async () => {
            await meeting.update(record => {
                // If there's an existing summary, append with a line break
                const current = record.summary || "";
                record.summary = current ? `${current}\n• ${newSummary}` : `• ${newSummary}`;
            });
        });
        console.log(`[DB] Updated summary for meeting: ${meeting.id}`);
    }
    /**
     * Saves a new transcript chunk attached to a specific meeting.
     */
    static async addTranscript(meeting: MeetingModel, text: string): Promise<TranscriptModel> {
        let transcript: TranscriptModel;
        await database.write(async () => {
            transcript = await database.get<TranscriptModel>('transcripts').create(record => {
                record.meeting.set(meeting);
                record.text = text;
                record.createdAt = new Date();
            });
        });
        console.log(`[DB] Saved transcript chunk: "${text.substring(0, 20)}..."`);
        return transcript!;
    }
}
