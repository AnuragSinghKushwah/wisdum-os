import { OpportunityId, InsightId } from '@wisdum/domain';
import type { InsightRepository } from '@wisdum/domain';
import type { OpportunityDto, OpportunityReadModel, KnowledgeReadModel } from '@wisdum/application';
import { toOpportunityDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { PostgresOpportunityRepository } from '../../persistence/postgres/opportunity-repository.postgres.js';

/** Reads off the Postgres write-side repository directly; no separate projection table yet. */
export class PostgresOpportunityReadModel implements OpportunityReadModel {
  constructor(
    private readonly repository: PostgresOpportunityRepository,
    private readonly insights: InsightRepository,
    private readonly knowledgeReads: KnowledgeReadModel,
  ) {}

  async findById(tenantId: TenantId, opportunityId: string): Promise<OpportunityDto | undefined> {
    const found = await this.repository.findById(OpportunityId.create(opportunityId));
    if (!found.some || found.value.tenantId !== tenantId) return undefined;
    
    const opportunity = found.value;
    const { sourceKnowledgeIds, sourceKnowledgeTitles } = await this.resolveAttributions(tenantId, opportunity.insightId);
    return toOpportunityDto(opportunity, sourceKnowledgeIds, sourceKnowledgeTitles);
  }

  async listByTenant(tenantId: TenantId): Promise<readonly OpportunityDto[]> {
    const opportunities = await this.repository.listByTenant(tenantId);
    return Promise.all(
      opportunities.map(async (opp) => {
        const { sourceKnowledgeIds, sourceKnowledgeTitles } = await this.resolveAttributions(tenantId, opp.insightId);
        return toOpportunityDto(opp, sourceKnowledgeIds, sourceKnowledgeTitles);
      })
    );
  }

  private async resolveAttributions(
    tenantId: TenantId,
    insightIdStr: string,
  ): Promise<{ sourceKnowledgeIds: string[]; sourceKnowledgeTitles: string[] }> {
    const foundInsight = await this.insights.findById(InsightId.create(insightIdStr));
    if (!foundInsight.some) {
      return { sourceKnowledgeIds: [], sourceKnowledgeTitles: [] };
    }
    const insight = foundInsight.value;
    const sourceKnowledgeIds = insight.sourceKnowledgeIds.map((id) => id.toString());
    const sourceKnowledgeTitles: string[] = [];
    for (const kid of sourceKnowledgeIds) {
      const asset = await this.knowledgeReads.findById(tenantId, kid);
      if (asset !== undefined) {
        sourceKnowledgeTitles.push(asset.title);
      }
    }
    return { sourceKnowledgeIds, sourceKnowledgeTitles };
  }
}
