import { Migration } from '@mikro-orm/migrations';

export class Migration20260918194343_voicebot extends Migration {

  override name = 'Migration20260918194343';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" add "crm_record_ref" text null, add "crm_error" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" drop column "crm_record_ref", drop column "crm_error";`);
  }

}
