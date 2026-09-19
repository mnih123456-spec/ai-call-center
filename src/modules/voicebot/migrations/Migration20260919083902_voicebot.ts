import { Migration } from '@mikro-orm/migrations';

export class Migration20260919083902_voicebot extends Migration {

  override name = 'Migration20260919083902';

  override up(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" add "industry" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "voicebot_agents" drop column "industry";`);
  }

}
