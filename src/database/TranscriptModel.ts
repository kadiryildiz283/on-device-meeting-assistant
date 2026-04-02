import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export class TranscriptModel extends Model {
    static table = 'transcripts';
    
    // STRICT RULE: Define the association mapping for WatermelonDB engine
    static associations = {
        meetings: { type: 'belongs_to', key: 'meeting_id' },
    } as const;
    
    // @ts-ignore
    @field('text') text!: string;
    
    // @ts-ignore
    @date('created_at') createdAt!: Date;

    // @ts-ignore
    @relation('meetings', 'meeting_id') meeting!: any;
}
