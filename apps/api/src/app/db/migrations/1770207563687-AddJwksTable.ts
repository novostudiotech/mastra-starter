import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJwksTable1770207563687 implements MigrationInterface {
  name = 'AddJwksTable1770207563687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "jwks" ("id" uuid NOT NULL, "publicKey" text NOT NULL, "privateKey" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_147086b49bf8366682d1a7ca7c1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95670308a8e27e601f0a0d2448" ON "jwks" ("expiresAt") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_95670308a8e27e601f0a0d2448"`);
    await queryRunner.query(`DROP TABLE "jwks"`);
  }
}
