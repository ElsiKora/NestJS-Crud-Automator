import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IApiBaseEntity } from '@elsikora/nestjs-crud-automator';

@Entity()
export class User implements IApiBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;
} 