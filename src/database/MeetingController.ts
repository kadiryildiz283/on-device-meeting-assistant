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
            });
        });
        console.log(`[DB] Created new meeting: ${meeting!.id}`);
        return meeting!;
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
