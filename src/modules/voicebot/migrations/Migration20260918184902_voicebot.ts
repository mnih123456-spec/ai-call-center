import { Migration } from '@mikro-orm/migrations';

export class Migration20260918184902_voicebot extends Migration {

  override name = 'Migration20260918184902';

  override up(): void | Promise<void> {
    this.addSql(`create table "voicebot_crm_connections" ("id" uuid not null default gen_random_uuid(), "provider" text not null default 'bitrix24', "webhook_url" text not null, "active" boolean not null default true, "checked_at" timestamptz null, "check_result" text null, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "voicebot_crm_connections" add constraint "voicebot_crm_conn_tenant_provider" unique ("tenant_id", "provider");`);
  }

}
