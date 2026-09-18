import { Migration } from '@mikro-orm/migrations';

export class Migration20260918165218_voicebot extends Migration {

  override name = 'Migration20260918165218';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" add "cost_usd" numeric(12,6) null, add "cost_credits" int null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_calls" drop column "cost_usd", drop column "cost_credits";`);
  }

}
