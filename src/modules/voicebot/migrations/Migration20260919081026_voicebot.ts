import { Migration } from '@mikro-orm/migrations';

export class Migration20260919081026_voicebot extends Migration {

  override name = 'Migration20260919081026';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" add "knowledge_text" text null, add "knowledge_read_at" timestamptz null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" drop column "knowledge_text", drop column "knowledge_read_at";`);
  }

}
