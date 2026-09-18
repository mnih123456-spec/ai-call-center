import { Migration } from '@mikro-orm/migrations';

export class Migration20260918202924_voicebot extends Migration {

  override name = 'Migration20260918202924';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_crm_connections" add "pipeline_id" text null, add "stage_id" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_crm_connections" drop column "pipeline_id", drop column "stage_id";`);
  }

}
