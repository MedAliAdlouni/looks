```mermaid
erDiagram
    USERS {
        UUID id PK
        String email
        String password_hash
        String full_name
        DateTime created_at
        DateTime updated_at
    }
    
    COURSES {
        UUID id PK
        UUID user_id FK
        String name
        Text description
        DateTime created_at
        DateTime updated_at
    }
    
    DOCUMENTS {
        UUID id PK
        UUID course_id FK
        String filename
        String file_path
        Integer file_size
        Integer num_pages
        String processing_status
        DateTime uploaded_at
        DateTime processed_at
    }
    
    CHUNKS {
        UUID id PK
        UUID document_id FK
        Text content
        Integer page_number
        Integer chunk_index
        Integer token_count
        DateTime created_at
    }
    
    CONVERSATIONS {
        UUID id PK
        UUID course_id FK
        String title
        DateTime created_at
        DateTime updated_at
    }
    
    MESSAGES {
        UUID id PK
        UUID conversation_id FK
        String role
        Text content
        JSONB sources
        DateTime created_at
    }

    %% Relationships
    USERS ||--o{ COURSES : "owns"
    COURSES ||--o{ DOCUMENTS : "has"
    COURSES ||--o{ CONVERSATIONS : "has"
    DOCUMENTS ||--o{ CHUNKS : "contains"
    CONVERSATIONS ||--o{ MESSAGES : "has"
