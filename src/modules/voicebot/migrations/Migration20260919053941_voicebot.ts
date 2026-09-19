import { Migration } from '@mikro-orm/migrations';

export class Migration20260919053941_voicebot extends Migration {

  override name = 'Migration20260919053941';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" add "is_test" boolean not null default false;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" drop column "is_test";`);
  }

}
