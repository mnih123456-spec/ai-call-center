import { Migration } from '@mikro-orm/migrations';

export class Migration20260916112803_voicebot extends Migration {

  override name = 'Migration20260916112803';

  override up(): void | Promise<void> {
    this.addSql(`create table "voicebot_calls" ("id" uuid not null default gen_random_uuid(), "campaign_id" uuid not null, "lead_ref" text null, "phone" text not null, "first_name" text null, "last_name" text null, "status" text not null default 'pending', "conversation_id" text null, "started_at" timestamptz null, "finished_at" timestamptz null, "duration_secs" int null, "failure_reason" text null, "identity_confirmed" boolean null, "consent_given" boolean null, "product_code" text null, "product_description" text null, "amount" text null, "currency" text null, "contract_year" text null, "bank" text null, "lead_active" boolean null, "requests_contact" boolean null, "preferred_contact_time" text null, "extra_notes" text null, "summary" text null, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "voicebot_calls_tenant_id_status_index" on "voicebot_calls" ("tenant_id", "status");`);
    this.addSql(`alter table "voicebot_calls" add constraint "voicebot_calls_tenant_id_conversation_id_unique" unique ("tenant_id", "conversation_id");`);

    this.addSql(`create table "voicebot_campaigns" ("id" uuid not null default gen_random_uuid(), "name" text not null, "description" text null, "agent_id" text not null, "phone_number_id" text null, "status" text not null default 'draft', "min_interval_secs" int not null default 180, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
  }

}
