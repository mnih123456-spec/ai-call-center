import { Migration } from '@mikro-orm/migrations';

export class Migration20260919164754_voicebot extends Migration {

  override name = 'Migration20260919164754';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" add "industry_knowledge" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" drop column "industry_knowledge";`);
  }

}
