import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @Matches(/^\d{11}$/, { message: 'cpf deve conter 11 dígitos' })
  cpf: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sex?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: 'phone deve conter 10 ou 11 dígitos' })
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

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
  @Matches(/^[A-Z]{2}$/, { message: 'state deve ser a sigla da UF' })
  state?: string | null;
}
