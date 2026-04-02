import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { MeetingModel } from './MeetingModel';
import { TranscriptModel } from './TranscriptModel';

const adapter = new SQLiteAdapter({
    schema,
    onSetUpError: error => {
        console.error("Database setup error:", error);
    }
});

export const database = new Database({
    adapter,
    modelClasses: [
        MeetingModel,
        TranscriptModel,
    ],
});
