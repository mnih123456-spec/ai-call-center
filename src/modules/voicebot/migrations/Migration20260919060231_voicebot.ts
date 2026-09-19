import { Migration } from '@mikro-orm/migrations';

export class Migration20260919060231_voicebot extends Migration {

  override name = 'Migration20260919060231';

  override up(): void | Promise<void> {
    this.addSql(`create table "voicebot_agents" ("id" uuid not null default gen_random_uuid(), "agent_id" text not null, "name" text not null, "direction" text not null default 'outbound', "questions" text null, "knowledge_url" text null, "synced_at" timestamptz null, "sync_result" text null, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "voicebot_agents_tenant_id_index" on "voicebot_agents" ("tenant_id");`);
  }

}
