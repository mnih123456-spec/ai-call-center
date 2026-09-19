import { Migration } from '@mikro-orm/migrations';

export class Migration20260919082337_voicebot extends Migration {

  override name = 'Migration20260919082337';

  override up(): void | Promise<void> {
    this.addSql(`create table "voicebot_limits" ("id" uuid not null default gen_random_uuid(), "minutes_per_month" int null, "max_voices" int null, "max_concurrent_calls" int null, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "voicebot_limits" add constraint "voicebot_limits_tenant_org" unique ("tenant_id", "organization_id");`);
  }

}
