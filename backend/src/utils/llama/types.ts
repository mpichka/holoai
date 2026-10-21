/**
 * TypeScript interfaces for the llama.cpp HTTP server API
 * Based on: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
 */

export type HealthCheckResponse = {
    status: 'ok' | 'error';
    error?: {
        code: number;
        message: string;
        type: string;
    };
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Sampler names used to build the sampling pipeline. */
export type SamplerType =
    'penalties' | 'dry' | 'top_k' | 'typ_p' | 'top_p' | 'min_p' | 'xtc' | 'temperature' | 'top_n_sigma';

/**
 * A logit-bias entry: [token, bias].
 * - token: token ID (number) or text string (all its tokens are biased).
 * - bias: float offset, or `false` to hard-ban the token.
 */
export type LogitBiasEntry = [number | string, number | false];

/** Per-request LoRA adapter scale override. */
export interface LoraAdapter {
    /** Adapter index (from GET /lora-adapters). */
    id: number;
    /** Scale factor to apply for this request. */
    scale: number;
}

// ---------------------------------------------------------------------------
// Message / content types
// ---------------------------------------------------------------------------

export interface TextContentPart {
    type: 'text';
    text: string;
}

export interface ImageContentPart {
    type: 'image_url';
    image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
}

/** llama.cpp's mtmd multimodal support — takes raw audio the same way vision takes an image. */
export interface AudioContentPart {
    type: 'input_audio';
    input_audio: {
        /** Base64-encoded audio, no `data:` prefix. */
        data: string;
        /** e.g. "wav", "mp3", "ogg" — the container/codec hint llama.cpp needs to decode it. */
        format: string;
    };
}

/**
 * llama.cpp's mtmd multimodal support for video. Unlike `image_url`, the
 * server does not accept a `data:` URI here — only a raw base64 payload
 * (see `server-common.cpp`'s `handle_media`, called with
 * `accept_base64_uri = false` for this content type).
 */
export interface VideoContentPart {
    type: 'input_video';
    input_video: {
        /** Base64-encoded video, no `data:` prefix. */
        data: string;
    };
}

export type ContentPart = TextContentPart | ImageContentPart | AudioContentPart | VideoContentPart;

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | ContentPart[];
    /** Tool call ID — required when role is "tool". */
    tool_call_id?: string;
    name?: string;
}

// ---------------------------------------------------------------------------
// Tool types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
        strict?: boolean;
    };
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}

export type ToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };

// ---------------------------------------------------------------------------
// Misc request types
// ---------------------------------------------------------------------------

export type ReasoningFormat = 'none' | 'deepseek' | 'deepseek-legacy' | 'auto';

export type ResponseFormat =
    | { type: 'text' }
    | { type: 'json_object'; schema?: Record<string, unknown> }
    | { type: 'json_schema'; schema: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Sampling parameters
// ---------------------------------------------------------------------------

export interface SamplingParams {
    /** Sampling temperature. Default: `0.8` */
    temperature?: number;
    /**
     * Dynamic temperature half-range.
     * Final temperature ∈ [temperature − range, temperature + range].
     * Default: `0.0` (disabled).
     */
    dynatemp_range?: number;
    /** Dynamic temperature exponent. Default: `1.0` */
    dynatemp_exponent?: number;
    /** Top-K sampling. Default: `40`; `0` = disabled. */
    top_k?: number;
    /** Top-P (nucleus) sampling. Default: `0.95`; `1.0` = disabled. */
    top_p?: number;
    /** Min-P sampling. Default: `0.05`; `0.0` = disabled. */
    min_p?: number;
    /** Top-N-Sigma sampling. Default: `-1.0` (disabled). */
    top_n_sigma?: number;
    /** XTC removal probability. Default: `0.0` (disabled). */
    xtc_probability?: number;
    /** XTC minimum probability threshold. Default: `0.1`; `>0.5` disables XTC. */
    xtc_threshold?: number;
    /** Locally-typical sampling parameter p. Default: `1.0` (disabled). */
    typical_p?: number;
    /**
     * Recent tokens considered for repetition penalty.
     * Default: `64`; `0` = disabled; `-1` = ctx-size.
     */
    repeat_last_n?: number;
    /** Repetition penalty multiplier. Default: `1.1`; `1.0` = disabled. */
    repeat_penalty?: number;
    /** Alpha presence penalty. Default: `0.0` (disabled). */
    presence_penalty?: number;
    /** Alpha frequency penalty. Default: `0.0` (disabled). */
    frequency_penalty?: number;
    /** DRY repetition penalty multiplier. Default: `0.0` (disabled). */
    dry_multiplier?: number;
    /** DRY repetition penalty base. Default: `1.75`. */
    dry_base?: number;
    /** Tokens extending repetition beyond this length get exponential penalty. Default: `2`. */
    dry_allowed_length?: number;
    /**
     * Number of tokens to scan for DRY repetitions.
     * Default: `-1` (`0` = disabled, `-1` = ctx-size).
     */
    dry_penalty_last_n?: number;
    /** Sequence-breaker strings for DRY sampling. Default: `["\n", ":", "\"", "*"]`. */
    dry_sequence_breakers?: string[];
    /**
     * Mirostat sampling mode.
     * `0` = disabled, `1` = Mirostat, `2` = Mirostat 2.0. Default: `0`.
     */
    mirostat?: 0 | 1 | 2;
    /** Mirostat target entropy τ. Default: `5.0`. */
    mirostat_tau?: number;
    /** Mirostat learning rate η. Default: `0.1`. */
    mirostat_eta?: number;
    /** BNF-like grammar string to constrain generation. Default: `""`. */
    grammar?: string;
    /** JSON Schema to constrain generation (e.g. `{}` for any JSON object). */
    json_schema?: Record<string, unknown>;
    /** RNG seed. Default: `-1` (random). */
    seed?: number;
    /** Ignore end-of-stream token and continue generating. Default: `false`. */
    ignore_eos?: boolean;
    /**
     * Token likelihood modifications: `[tokenIdOrString, biasOrFalse]`.
     * Default: `[]`.
     */
    logit_bias?: LogitBiasEntry[];
    /** Return top-N token probabilities at each step. Default: `0` (disabled). */
    n_probs?: number;
    /** Force samplers to return at least N tokens. Default: `0` (disabled). */
    min_keep?: number;
    /**
     * Ordered list of samplers to apply.
     * Default: `["dry", "top_k", "typ_p", "top_p", "min_p", "xtc", "temperature"]`.
     */
    samplers?: SamplerType[];
    /** Adaptive-P target probability (0..1; negative = disabled). Default: `-1.0`. */
    adaptive_target?: number;
    /** Adaptive-P decay rate (0..0.99). Default: `0.9`. */
    adaptive_decay?: number;
}

// ---------------------------------------------------------------------------
// POST /v1/chat/completions — request
// ---------------------------------------------------------------------------

export interface ChatCompletionRequest extends SamplingParams {
    /** Model identifier. Required. */
    model?: string;
    /** Conversation history. Required. */
    messages: ChatMessage[];
    /** Maximum tokens to generate. */
    max_tokens?: number;
    /** Stream tokens via SSE. Default: `false`. */
    stream?: boolean;
    /** Stop string(s). Generation halts when hit. */
    stop?: string | string[];
    /** Structured output format constraint. */
    response_format?: ResponseFormat;
    /** Tool definitions available to the model (requires `--jinja` on server). */
    tools?: ToolDefinition[];
    /** How the model should select tools. */
    tool_choice?: ToolChoice;
    /** Allow the model to call multiple tools in one turn. */
    parallel_tool_calls?: boolean;
    /** End-user identifier (passed through, not used by server). */
    user?: string;

    // llama.cpp-specific extensions
    /** Max tokens to generate (llama.cpp alias for max_tokens). Default: `-1` (∞). */
    n_predict?: number;
    /**
     * Tokens from the prompt to keep on context overflow.
     * `0` = none; `-1` = all. Default: `0`.
     */
    n_keep?: number;
    /** Min chunk size for KV-shift cache reuse. Default: `0` (disabled). */
    n_cache_reuse?: number;
    /** Re-use KV cache from previous request when prefix matches. Default: `true`. */
    cache_prompt?: boolean;
    /** Pin this request to a specific server slot. `-1` = any idle slot. */
    id_slot?: number;
    /** Include per-token timing info in each response. Default: `false`. */
    timings_per_token?: boolean;
    /** Per-request LoRA adapter scale overrides. */
    lora?: LoraAdapter[];
    /** How to handle chain-of-thought / reasoning tags in the output. Default: `"auto"`. */
    reasoning_format?: ReasoningFormat;
    /** Force a reasoning model to always output its thinking. Default: `false`. */
    thinking_forced_open?: boolean;
    /** Parse tool calls from the generated text. Default: `true`. */
    parse_tool_calls?: boolean;
    /** Extra parameters forwarded to the Jinja template engine. */
    chat_template_kwargs?: Record<string, unknown>;

    thinking_budget_tokens?: number;
}

// ---------------------------------------------------------------------------
// POST /v1/chat/completions — response
// ---------------------------------------------------------------------------

export interface ChatCompletionChoice {
    index: number;
    message: {
        role: 'assistant';
        content: string | null;
        /** Chain-of-thought text (present when reasoning_format is "deepseek"). */
        reasoning_content?: string;
        tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
    logprobs?: unknown;
}

export interface ChatCompletionTimings {
    /** Prompt tokens reused from KV cache. */
    cache_n: number;
    /** Prompt tokens actually processed. */
    prompt_n: number;
    prompt_ms: number;
    prompt_per_token_ms: number;
    prompt_per_second: number;
    /** Generated tokens. */
    predicted_n: number;
    predicted_ms: number;
    predicted_per_token_ms: number;
    predicted_per_second: number;
}

export interface ChatCompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: ChatCompletionChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    /** llama.cpp extension — present when timings_per_token is true. */
    timings?: ChatCompletionTimings;
}

// CUSTOM TYPES

export type AIRole = 'system' | 'assistant' | 'user';

export interface Message {
    role: AIRole;
    content: string;
}

export interface MessageTimings {
    // how many tokens were in the prompt
    prompt_n: number;
    // how many were served from KV cache (useful for spotting cache misses)
    cache_n: number;
    // how many tokens were generated
    predicted_n: number;
    // generation speed; the single most useful performance signal
    predicted_per_second: number;
}

export interface BufferedMessage extends Message {
    id: string;
    createdAt: number;
    tool: boolean;
    /** Present when `tool` is true — the calls the model requested this turn. */
    toolCalls?: ToolCall[];
    reasoning?: string;
    timings?: MessageTimings | null;
    /** The message this reply is addressed to, if it was answering a trigger. */
    replyToMessageId?: number;
}
