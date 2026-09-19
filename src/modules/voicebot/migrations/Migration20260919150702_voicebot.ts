import { Migration } from '@mikro-orm/migrations';

export class Migration20260919150702_voicebot extends Migration {

  override name = 'Migration20260919150702';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" add "collected" jsonb null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" drop column "collected";`);
  }

}
