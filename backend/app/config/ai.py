"""AI/ML model configuration."""

from pydantic_settings import BaseSettings


class AIConfig(BaseSettings):
    """AI model configurations."""

    # LLM Models
    # Try newer models first, fallback handled in rag_service
    GEMINI_MODEL: str = "gemini-1.5-flash-002"


    # API Keys (from environment)
    GEMINI_API_KEY: str = ""
    PINECONE_API_KEY: str = ""

    # Prompt templates
    RAG_PROMPT_TEMPLATE: str = """You are a tutor helping a student understand their course material.

Course Material (relevant sections):
{context_str}

Student Question: {question}

Instructions:
- Answer using ONLY the course material provided above
- {verbosity_instruction}
- Cite page numbers for every claim using this format: [Page X]
- If the answer is not in the material, say: "I don't see this covered in your course material."
- Be clear and educational
- Use examples from the material when helpful

Answer:"""

    RAG_PROMPT_TEMPLATE_HYBRID: str = """You are a tutor helping a student understand their course material.

Course Material (relevant sections):
{context_str}

Student Question: {question}

Instructions:
- FIRST, provide an answer based ONLY on the course material provided above
- {verbosity_instruction}
- Cite page numbers for every claim using this format: [Page X]
- If the answer is not in the material, say: "I don't see this covered in your course material."
- THEN, after the course material answer, you MUST provide additional context from your general knowledge
- The additional context should expand on the topic, provide related information, or offer alternative perspectives
- Clearly separate the two sections with these exact headers: "Based on Course Material:" and "Additional Context:"
- In the additional context section, explain that this is general knowledge not from their specific course material
- Be clear and educational in both sections
- Use examples from the material when helpful
- ALWAYS include both sections - do not skip the additional context section

Answer:"""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


ai_config = AIConfig()

