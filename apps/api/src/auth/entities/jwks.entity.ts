import { Column, CreateDateColumn, Entity, Index } from 'typeorm';
import { PrimaryUuidV7AutoColumn } from '#/app/db/decorators/primary-uuid-v7-auto-column.decorator';

/**
 * JWKS (JSON Web Key Set) entity for Better Auth JWT plugin
 * Stores cryptographic key pairs for JWT signing and verification
 * @see https://www.better-auth.com/docs/plugins/jwt#schema
 */
@Entity('jwks')
@Index(['expiresAt'])
export class JwksEntity {
  @PrimaryUuidV7AutoColumn()
  id: string;

  /**
   * Public key for JWT verification
   * Stored as string (typically in JWK format)
   */
  @Column({ type: 'text' })
  publicKey: string;

  /**
   * Private key for JWT signing
   * Stored as string (typically encrypted by Better Auth)
   */
  @Column({ type: 'text' })
  privateKey: string;

  /**
   * Timestamp when the key pair was created
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Timestamp when the key pair expires (optional)
   * Used for key rotation
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
