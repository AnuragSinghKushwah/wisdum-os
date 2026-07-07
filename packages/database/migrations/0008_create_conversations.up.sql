-- Conversation aggregate: an append-only AI transcript with accumulated token usage.
CREATE TABLE conversations (
    id                   uuid PRIMARY KEY,
    tenant_id            uuid NOT NULL REFERENCES tenants (id),
    provider             text NOT NULL,
    model_name           text NOT NULL,
    owner_id             uuid NOT NULL,
    title                text,
    status               text NOT NULL,
    total_input_tokens   bigint NOT NULL DEFAULT 0,
    total_output_tokens  bigint NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL,
    updated_at           timestamptz NOT NULL
);

CREATE INDEX conversations_tenant_id_idx ON conversations (tenant_id);
CREATE INDEX conversations_owner_id_idx ON conversations (owner_id);

-- Append-only transcript; message_index preserves turn order.
CREATE TABLE conversation_messages (
    conversation_id  uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    message_index    integer NOT NULL,
    role             text NOT NULL,
    content          text NOT NULL,
    input_tokens     bigint,
    output_tokens    bigint,
    created_at       timestamptz NOT NULL,
    PRIMARY KEY (conversation_id, message_index)
);

-- Tool calls requested by an assistant message; result_json is null while pending.
CREATE TABLE conversation_message_tool_calls (
    id               uuid PRIMARY KEY,
    conversation_id  uuid NOT NULL,
    message_index    integer NOT NULL,
    tool_name        text NOT NULL,
    arguments_json   text NOT NULL,
    status           text NOT NULL,
    result_json      text,
    FOREIGN KEY (conversation_id, message_index)
        REFERENCES conversation_messages (conversation_id, message_index) ON DELETE CASCADE
);

CREATE INDEX conversation_message_tool_calls_message_idx
    ON conversation_message_tool_calls (conversation_id, message_index);
