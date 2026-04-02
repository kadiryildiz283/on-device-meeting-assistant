import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'meetings',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'summary', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'transcripts',
            columns: [
                { name: 'meeting_id', type: 'string', isIndexed: true },
                { name: 'text', type: 'string' },
                { name: 'created_at', type: 'number' },
            ]
        })
    ]
});
