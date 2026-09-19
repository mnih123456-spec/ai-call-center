import { Migration } from '@mikro-orm/migrations';

export class Migration20260919101940_voicebot extends Migration {

  override name = 'Migration20260919101940';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_limits" add "allowed_numbers" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_limits" drop column "allowed_numbers";`);
  }

}
