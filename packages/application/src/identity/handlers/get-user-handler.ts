import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { UserDto } from '../dto/user-dto.js';
import type { UserReadModel } from '../ports/user-read-model.js';
import type { GetUserQuery } from '../queries/get-user-query.js';

export class GetUserHandler implements QueryHandler<GetUserQuery, UserDto> {
  constructor(private readonly reads: UserReadModel) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const dto = await this.reads.findById(query.userId);
    if (dto === undefined) {
      throw new NotFoundError('User not found', { userId: query.userId });
    }
    return dto;
  }
}
