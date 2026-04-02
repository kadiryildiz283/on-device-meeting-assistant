import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export class MeetingModel extends Model {
    static table = 'meetings';
    
    // STRICT RULE: Define the association mapping for WatermelonDB engine
    static associations = {
        transcripts: { type: 'has_many', foreignKey: 'meeting_id' },
    } as const;
    
    // @ts-ignore
    @field('title') title!: string;
    
    // @ts-ignore
    @field('summary') summary?: string;
    
    // @ts-ignore
    @date('created_at') createdAt!: Date;

    // @ts-ignore
    @children('transcripts') transcripts!: any;
}
