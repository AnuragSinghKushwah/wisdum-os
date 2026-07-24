CREATE TABLE agent_tasks (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants (id),
    agent_type    text NOT NULL,
    status        text NOT NULL,
    payload       jsonb NOT NULL,
    result        jsonb,
    error         text,
    created_at    timestamptz NOT NULL,
    updated_at    timestamptz NOT NULL
);

CREATE INDEX agent_tasks_tenant_id_status_idx ON agent_tasks (tenant_id, status);
