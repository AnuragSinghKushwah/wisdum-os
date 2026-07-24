import type {
  GraphEdgeDto,
  GraphNodeDto,
  GraphReadModel,
  GraphTopologyDto,
} from '@wisdum/application';
import type { ConceptRelationshipRow, ConceptRow, PgPool } from '@wisdum/database';
import type { TenantId } from '@wisdum/types';

export class PostgresGraphReadModel implements GraphReadModel {
  constructor(private readonly pool: PgPool) {}

  async getTopology(tenantId: TenantId): Promise<GraphTopologyDto> {
    const [conceptRes, relRes] = await Promise.all([
      this.pool.query<ConceptRow>(
        'SELECT * FROM concepts WHERE tenant_id = $1 ORDER BY mention_count DESC',
        [tenantId],
      ),
      this.pool.query<ConceptRelationshipRow>(
        'SELECT * FROM concept_relationships WHERE tenant_id = $1 ORDER BY occurrence_count DESC',
        [tenantId],
      ),
    ]);

    const nodes: GraphNodeDto[] = conceptRes.rows.map((row) => ({
      id: row.id,
      label: row.name,
      type: 'concept',
      weight: row.mention_count,
      description: row.description,
    }));

    const edges: GraphEdgeDto[] = relRes.rows.map((row) => ({
      source: row.concept_a_id,
      target: row.concept_b_id,
      label: row.relationship_type,
      occurrenceCount: row.occurrence_count,
    }));

    return { nodes, edges };
  }

  async getNeighbors(tenantId: TenantId, conceptId: string, depth = 1): Promise<GraphTopologyDto> {
    const relRes = await this.pool.query<ConceptRelationshipRow>(
      `SELECT * FROM concept_relationships 
       WHERE tenant_id = $1 AND (concept_a_id = $2 OR concept_b_id = $2)`,
      [tenantId, conceptId],
    );

    const neighborIds = new Set<string>();
    neighborIds.add(conceptId);
    for (const rel of relRes.rows) {
      neighborIds.add(rel.concept_a_id);
      neighborIds.add(rel.concept_b_id);
    }

    const conceptRes = await this.pool.query<ConceptRow>(
      'SELECT * FROM concepts WHERE tenant_id = $1 AND id = ANY($2::uuid[])',
      [tenantId, Array.from(neighborIds)],
    );

    const nodes: GraphNodeDto[] = conceptRes.rows.map((row) => ({
      id: row.id,
      label: row.name,
      type: 'concept',
      weight: row.mention_count,
      description: row.description,
    }));

    const edges: GraphEdgeDto[] = relRes.rows.map((row) => ({
      source: row.concept_a_id,
      target: row.concept_b_id,
      label: row.relationship_type,
      occurrenceCount: row.occurrence_count,
    }));

    return { nodes, edges };
  }

  async getConcepts(tenantId: TenantId): Promise<readonly GraphNodeDto[]> {
    const res = await this.pool.query<ConceptRow>(
      'SELECT * FROM concepts WHERE tenant_id = $1 ORDER BY mention_count DESC',
      [tenantId],
    );
    return res.rows.map((row) => ({
      id: row.id,
      label: row.name,
      type: 'concept',
      weight: row.mention_count,
      description: row.description,
    }));
  }

  async getRelationships(tenantId: TenantId): Promise<readonly GraphEdgeDto[]> {
    const res = await this.pool.query<ConceptRelationshipRow>(
      'SELECT * FROM concept_relationships WHERE tenant_id = $1 ORDER BY occurrence_count DESC',
      [tenantId],
    );
    return res.rows.map((row) => ({
      source: row.concept_a_id,
      target: row.concept_b_id,
      label: row.relationship_type,
      occurrenceCount: row.occurrence_count,
    }));
  }
}
