import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TIME_OF_DAY } from '../../common/date-time.js';
import { IsCnpj } from '../../common/validators/brazilian-documents.js';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsCnpj()
  cnpj: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: 'phone deve conter 10 ou 11 dígitos' })
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  contactEmail?: string | null;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'zipCode deve conter 8 dígitos' })
  zipCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  street?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  streetNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressComplement?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @IsOptional()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'state deve ser a sigla da UF' })
  state?: string | null;

  @IsOptional()
  @Matches(TIME_OF_DAY, { message: 'openingTime deve estar no formato HH:MM' })
  openingTime?: string | null;

  @IsOptional()
  @Matches(TIME_OF_DAY, { message: 'closingTime deve estar no formato HH:MM' })
  closingTime?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];
}
