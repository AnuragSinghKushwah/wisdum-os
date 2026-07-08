import { ContentBody, ContentDraftId, ContentTitle } from '@wisdum/domain';
import type { ContentDraftRepository } from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';

import type { UpdateContentDraftCommand } from '../commands/update-content-draft-command.js';

export class UpdateContentDraftHandler implements CommandHandler<UpdateContentDraftCommand> {
  constructor(
    private readonly drafts: ContentDraftRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateContentDraftCommand): Promise<void> {
    const found = await this.drafts.findById(ContentDraftId.create(command.draftId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Content draft not found', { draftId: command.draftId });
    }
    found.value.updateContent(
      ContentTitle.create(command.title),
      ContentBody.create(command.body),
      this.clock,
    );
    await this.drafts.save(found.value);
  }
}
