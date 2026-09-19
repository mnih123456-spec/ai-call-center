import { Migration } from '@mikro-orm/migrations';

export class Migration20260919050353_voicebot extends Migration {

  override name = 'Migration20260919050353';

  override up(): void | Promise<void> {
    this.addSql(`create table "voicebot_voices" ("id" uuid not null default gen_random_uuid(), "voice_id" text not null, "name" text not null, "consent_person" text not null, "consent_confirmed_by" uuid null, "consent_at" timestamptz not null, "tenant_id" uuid null, "organization_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "voicebot_voices_tenant_id_index" on "voicebot_voices" ("tenant_id");`);
  }

}
