import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Matches(/^\d{14}$/, { message: 'cnpj deve conter 14 dígitos' })
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
}
