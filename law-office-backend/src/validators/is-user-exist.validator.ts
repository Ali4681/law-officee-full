// validators/is-user-exist.validator.ts
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { UsersService } from '../users/users.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUserExist implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async validate(value: string | string[], args: ValidationArguments) {
    // Normalize value to an array for consistent processing
    const ids = Array.isArray(value) ? value : [value];

    if (args.property === 'clientId') {
      const user = await this.usersService.findByIdOrNull(ids[0]);
      if (!user) {
        console.log(
          `[Client Validation FAILED] clientId: ${ids[0]} → User not found`,
        );
        return false;
      }
      if (user.role !== 'client') {
        console.log(
          `[Client Validation FAILED] clientId: ${ids[0]} → Role mismatch (found: ${user.role})`,
        );
        return false;
      }
      console.log(
        `[Client Validation PASSED] clientId: ${ids[0]} → Role: ${user.role}`,
      );
      return true;
    }

    if (args.property === 'lawyerIds') {
      let allValid = true;

      for (const id of ids) {
        const user = await this.usersService.findByIdOrNull(id);
        if (!user) {
          console.log(
            `[Lawyer Validation FAILED] lawyerId: ${id} → User not found`,
          );
          allValid = false;
          continue;
        }
        if (user.role !== 'lawyer') {
          console.log(
            `[Lawyer Validation FAILED] lawyerId: ${id} → Role mismatch (found: ${user.role})`,
          );
          allValid = false;
          continue;
        }
        console.log(
          `[Lawyer Validation PASSED] lawyerId: ${id} → Role: ${user.role}`,
        );
      }

      return allValid;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} contains invalid ID(s) or role mismatch`;
  }
}
