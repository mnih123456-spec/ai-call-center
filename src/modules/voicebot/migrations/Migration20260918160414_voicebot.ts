import { Migration } from '@mikro-orm/migrations';

export class Migration20260918160414_voicebot extends Migration {

  override name = 'Migration20260918160414';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" add "direction" text not null default 'outbound', add "related_call_id" uuid null;`);
    this.addSql(`alter table "voicebot_calls" alter column "campaign_id" drop not null;`);
    this.addSql(`create index "voicebot_calls_tenant_id_phone_index" on "voicebot_calls" ("tenant_id", "phone");`);

    this.addSql(`create index "voicebot_campaigns_phone_number_id_index" on "voicebot_campaigns" ("phone_number_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "voicebot_calls_tenant_id_phone_index";`);
    this.addSql(`alter table "voicebot_calls" drop column "direction", drop column "related_call_id";`);
    this.addSql(`alter table "voicebot_calls" alter column "campaign_id" set not null;`);

    this.addSql(`drop index "voicebot_campaigns_phone_number_id_index";`);
  }

}
