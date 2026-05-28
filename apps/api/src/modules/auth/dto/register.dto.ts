import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ example: 'My Business' })
  @IsString() @MinLength(2) @MaxLength(100)
  organizationName: string;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional() @IsString()
  timezone?: string;
}
