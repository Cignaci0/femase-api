import { User } from "../user.entity";

export class CreateUserDto {
  idUsuario: number;
  usuario: User;
  ip: string;
  userAgent: string;
}