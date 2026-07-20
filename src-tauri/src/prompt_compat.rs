use std::collections::BTreeSet;
use std::sync::OnceLock;

use serde::Deserialize;

use crate::models::AgentTurnRequest;

const COMPATIBILITY_CONFIG: &str = include_str!("../prompts/prompt_compatibility.json");
const CLAUDE_CODE_FABLE_5_INDEX: &str =
    include_str!("../prompts/source/claude_code_fable_5.index.json");
const CODEX_GPT_56_SOL_INDEX: &str = include_str!("../prompts/source/codex_gpt_5_6_sol.index.json");
const GROK_BUILD_INDEX: &str = include_str!("../prompts/source/grok_build.index.json");
const CODEX_GPT_56_SOL: &str = include_str!("../prompts/source/codex_gpt_5_6_sol.md");
const CLAUDE_CODE_FABLE_5: &str = include_str!("../prompts/source/claude_code_fable_5.md");
const GROK_BUILD: &str = include_str!("../prompts/source/grok_build.md");
const DEEPSEEK_CHAT: &str = include_str!("../prompts/source/deepseek_chat.md");
const GLM: &str = include_str!("../prompts/source/glm.md");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompatibilityConfig {
    tool_aliases: Vec<ToolAlias>,
    unsupported_tokens: Vec<String>,
    text_replacements: Vec<TextReplacement>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToolAlias {
    source: String,
    target: String,
    target_tool: String,
}

#[derive(Debug, Deserialize)]
struct TextReplacement {
    source: String,
    target: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PromptIndexConfig {
    default_sections: Vec<String>,
    full_sections: Vec<String>,
    sections: Vec<PromptIndexSection>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PromptIndexSection {
    id: String,
    start_line: usize,
    end_line: usize,
}

#[derive(Debug, Clone, Copy)]
enum PackKind {
    Sol,
    Claude,
    Grok,
    NativeEmpty,
}

#[derive(Debug, Clone, Copy)]
struct PromptSource {
    id: &'static str,
    sha256: &'static str,
    content: &'static str,
    kind: PackKind,
}

#[derive(Debug, Clone)]
pub struct CompatiblePrompt {
    pub text: String,
    #[allow(dead_code)]
    pub source_id: &'static str,
    #[allow(dead_code)]
    pub source_sha256: &'static str,
    #[allow(dead_code)]
    pub source_chars: usize,
    #[allow(dead_code)]
    pub compatible_chars: usize,
}

pub fn compile(profile_id: &str, request: &AgentTurnRequest, fallback: &str) -> CompatiblePrompt {
    let source = source_for_profile(profile_id);
    let available_tools = available_tool_names(request);
    let normalized_source = source.content.replace("\r\n", "\n");
    let mut prompt_index = "full-source";
    let mut compatible = match source.kind {
        PackKind::Sol => {
            prompt_index = "codex-sol-index";
            indexed_prompt(&normalized_source, codex_prompt_index(), false)
        }
        PackKind::Claude => {
            prompt_index = if profile_id == "claude_code_full" {
                "claude-fable5-full-index"
            } else {
                "claude-fable5-default-index"
            };
            indexed_claude_prompt(&normalized_source, profile_id)
        }
        PackKind::Grok => {
            prompt_index = "grok-build-index";
            indexed_prompt(&normalized_source, grok_prompt_index(), false)
        }
        PackKind::NativeEmpty => fallback.to_owned(),
    };

    compatible = apply_compatibility(compatible, &available_tools);
    if compatible.trim().is_empty() {
        compatible = fallback.to_owned();
    }
    let compatible_chars = compatible.chars().count();
    let substitutions = compatibility_config()
        .tool_aliases
        .iter()
        .filter(|alias| available_tools.contains(&alias.target_tool))
        .map(|alias| alias.target.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>()
        .join(", ");
    let text = format!(
        "Built-in Client Prompt Pack\nSource: {}\nSource SHA-256: {}\nPrompt index: {}\nCompatibility: client-specific runtime values and unavailable tool contracts were removed; supported behavior was mapped to this turn's LevelUpAgent tools. The Platform Kernel and actual function schemas remain authoritative.\nAvailable compatibility tools: {}\n\n{}",
        source.id,
        source.sha256,
        prompt_index,
        if substitutions.is_empty() {
            "none"
        } else {
            &substitutions
        },
        compatible.trim(),
    );
    CompatiblePrompt {
        text,
        source_id: source.id,
        source_sha256: source.sha256,
        source_chars: source.content.chars().count(),
        compatible_chars,
    }
}

fn claude_prompt_index() -> &'static PromptIndexConfig {
    static INDEX: OnceLock<PromptIndexConfig> = OnceLock::new();
    INDEX.get_or_init(|| {
        serde_json::from_str(CLAUDE_CODE_FABLE_5_INDEX)
            .expect("built-in Claude prompt index is valid")
    })
}

fn codex_prompt_index() -> &'static PromptIndexConfig {
    static INDEX: OnceLock<PromptIndexConfig> = OnceLock::new();
    INDEX.get_or_init(|| {
        serde_json::from_str(CODEX_GPT_56_SOL_INDEX).expect("built-in Codex prompt index is valid")
    })
}

fn grok_prompt_index() -> &'static PromptIndexConfig {
    static INDEX: OnceLock<PromptIndexConfig> = OnceLock::new();
    INDEX.get_or_init(|| {
        serde_json::from_str(GROK_BUILD_INDEX).expect("built-in Grok prompt index is valid")
    })
}

fn indexed_claude_prompt(source: &str, profile_id: &str) -> String {
    indexed_prompt(
        source,
        claude_prompt_index(),
        profile_id == "claude_code_full",
    )
}

fn indexed_prompt(source: &str, index: &PromptIndexConfig, full: bool) -> String {
    let selected_ids = if full {
        &index.full_sections
    } else {
        &index.default_sections
    };
    let sections = selected_ids
        .iter()
        .filter_map(|id| index.sections.iter().find(|section| &section.id == id))
        .map(|section| line_range(source, section.start_line, section.end_line))
        .filter(|section| !section.trim().is_empty())
        .collect::<Vec<_>>();
    sections.join("\n\n")
}

fn line_range(source: &str, start_line: usize, end_line: usize) -> String {
    source
        .lines()
        .skip(start_line.saturating_sub(1))
        .take(end_line.saturating_sub(start_line).saturating_add(1))
        .collect::<Vec<_>>()
        .join("\n")
}

fn compatibility_config() -> &'static CompatibilityConfig {
    static CONFIG: OnceLock<CompatibilityConfig> = OnceLock::new();
    CONFIG.get_or_init(|| {
        serde_json::from_str(COMPATIBILITY_CONFIG)
            .expect("built-in prompt compatibility configuration is valid")
    })
}

fn source_for_profile(profile_id: &str) -> PromptSource {
    match profile_id {
        "codex" | "codex_5_5" | "codex_5_6" | "codex_5_6_sol" | "codex_5_6_terra"
        | "codex_5_6_luna" => PromptSource {
            id: "OpenAI/gpt-5.6-sol-extra-high",
            sha256: "393968cc08b8f1330ec90f28359b21edb4ca2cc50ae82467d271d34352506dfe",
            content: CODEX_GPT_56_SOL,
            kind: PackKind::Sol,
        },
        "claude_code_full"
        | "claude_code_lean"
        | "claude_code_fable_5"
        | "claude_code_opus_4_6"
        | "claude_code_opus_4_7"
        | "claude_code_opus_4_8" => PromptSource {
            id: "Anthropic/Claude Code/claude-code-fable-5",
            sha256: "90a50edfd9f13a787dc5558c37a1ab59d722681c909af42b34057a88f31b0835",
            content: CLAUDE_CODE_FABLE_5,
            kind: PackKind::Claude,
        },
        "grok_build" => PromptSource {
            id: "xAI/grok-build",
            sha256: "75954319ddf6639079952bad80149252cd0c98d8989deb266fa3cde47166509d",
            content: GROK_BUILD,
            kind: PackKind::Grok,
        },
        "deepseek_v4" => PromptSource {
            id: "DeepSeek/deepseek-chat",
            sha256: "7c19eb53c60e419867c901b7e57bec0ab7a8be486b514e663e7144531cb8336e",
            content: DEEPSEEK_CHAT,
            kind: PackKind::NativeEmpty,
        },
        "glm_5_2" => PromptSource {
            id: "GLM/no-upstream-system-prompt",
            sha256: "d38210f9fcf440da25d02b1967d231882b0a8279a27df6bf325e39304bc9eba0",
            content: GLM,
            kind: PackKind::NativeEmpty,
        },
        _ => PromptSource {
            id: "LevelUpAgent/levelup-generic",
            sha256: "built-in",
            content: "",
            kind: PackKind::NativeEmpty,
        },
    }
}

fn available_tool_names(request: &AgentTurnRequest) -> BTreeSet<String> {
    let mut names = BTreeSet::new();
    if request
        .workspace
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty())
    {
        names.extend(
            ["list_files", "read_file", "search_files"]
                .into_iter()
                .map(str::to_owned),
        );
        if request.mode != "plan" {
            names.extend(
                ["write_file", "delete_file", "run_command"]
                    .into_iter()
                    .map(str::to_owned),
            );
        }
    }
    names.extend(
        request.available_tools.iter().filter_map(|tool| {
            (request.mode != "plan" || tool.read_only).then(|| tool.name.clone())
        }),
    );
    names
}

fn apply_compatibility(text: String, available_tools: &BTreeSet<String>) -> String {
    let config = compatibility_config();
    let mut output = Vec::new();
    'line: for source_line in text.lines() {
        let mut line = source_line.to_owned();
        for alias in &config.tool_aliases {
            if !line.contains(&alias.source) {
                continue;
            }
            if !available_tools.contains(&alias.target_tool) {
                continue 'line;
            }
            line = line.replace(&alias.source, &alias.target);
        }
        if config.tool_aliases.iter().any(|alias| {
            !available_tools.contains(&alias.target_tool) && line.contains(&alias.target)
        }) {
            continue 'line;
        }
        if config
            .unsupported_tokens
            .iter()
            .any(|token| line.contains(token))
        {
            continue;
        }
        for replacement in &config.text_replacements {
            line = line.replace(&replacement.source, &replacement.target);
        }
        output.push(line);
    }
    collapse_blank_lines(output.join("\n"))
}

fn collapse_blank_lines(source: String) -> String {
    let mut output = String::new();
    let mut blank = false;
    for line in source.lines() {
        if line.trim().is_empty() {
            if blank {
                continue;
            }
            blank = true;
        } else {
            blank = false;
        }
        output.push_str(line.trim_end());
        output.push('\n');
    }
    output.trim().to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        AgentMessage, AgentToolDefinition, HarnessSelection, PermissionLevel, ProviderProfile,
        ProviderProtocol,
    };

    fn request(mode: &str) -> AgentTurnRequest {
        AgentTurnRequest {
            profile: ProviderProfile {
                id: "test".to_owned(),
                name: "Test".to_owned(),
                base_url: "https://example.test".to_owned(),
                model: "test".to_owned(),
                protocol: ProviderProtocol::OpenaiResponses,
                allow_unauthenticated: false,
                priority: 100,
                failover_enabled: true,
                default_harness: HarnessSelection::default(),
            },
            messages: vec![AgentMessage {
                role: "user".to_owned(),
                content: "test".to_owned(),
                tool_calls: Vec::new(),
                tool_call_id: None,
                internal: false,
                attachments: Vec::new(),
            }],
            mode: mode.to_owned(),
            workspace: Some("C:/workspace".to_owned()),
            thread_id: None,
            available_tools: vec![AgentToolDefinition {
                name: "delegate_task".to_owned(),
                description: "test".to_owned(),
                input_schema: serde_json::json!({"type": "object"}),
                read_only: false,
            }],
            available_skills: Vec::new(),
            goal: None,
            fallback_profiles: Vec::new(),
            custom_instructions: None,
            harness: HarnessSelection::default(),
            permission_level: PermissionLevel::Full,
        }
    }

    #[test]
    fn compact_packs_are_embedded_and_compatibility_output_is_substantial() {
        let request = request("agent");
        let codex = compile("codex_5_6", &request, "fallback");
        let sol = compile("codex_5_6_sol", &request, "fallback");
        let claude = compile("claude_code_opus_4_8", &request, "fallback");
        let grok = compile("grok_build", &request, "fallback");
        assert!(codex.source_chars > 2_000);
        assert!(claude.source_chars > 3_000);
        assert!(grok.source_chars > 1_500);
        assert!(codex.compatible_chars > 1_500);
        assert!(sol.compatible_chars > 1_500);
        assert!(claude.compatible_chars > 2_500);
        assert!(
            grok.compatible_chars > 1_000,
            "grok compatible chars: {}",
            grok.compatible_chars
        );
    }

    #[test]
    fn codex_and_grok_use_compact_indexed_packs() {
        let request = request("agent");
        let codex = compile("codex_5_6_sol", &request, "fallback");
        let grok = compile("grok_build", &request, "fallback");

        assert!(codex.source_chars < 5_000);
        assert!(grok.source_chars < 5_000);
        assert!(codex.text.contains("Prompt index: codex-sol-index"));
        assert!(grok.text.contains("Prompt index: grok-build-index"));
        assert!(codex.text.contains("## Engineering workflow"));
        assert!(grok.text.contains("## Task management"));
        assert!(!codex.text.contains("Namespace: web"));
        assert!(!grok.text.contains("Tool Definitions & JSON Schemas"));
    }

    #[test]
    fn unavailable_client_contracts_are_removed_and_supported_tools_are_mapped() {
        let compiled = compile("grok_build", &request("agent"), "fallback");
        assert!(!compiled.text.contains("todo_write"));
        assert!(!compiled.text.contains("run_terminal_command"));
        assert!(!compiled.text.contains("memory_search"));
        assert!(!compiled.text.contains("## 2. Tool Definitions"));
        assert!(compiled.text.contains("run_command"));
        assert!(compiled.text.contains("delegate_task"));
    }

    #[test]
    fn sol_pack_drops_unavailable_artifact_and_web_contracts() {
        let compiled = compile("codex_5_6_sol", &request("agent"), "fallback");
        assert!(!compiled.text.contains("web.run"));
        assert!(!compiled.text.contains("artifact_tool"));
        assert!(!compiled.text.contains("openpyxl"));
    }

    #[test]
    fn claude_dynamic_session_and_tool_catalog_are_not_injected() {
        let compiled = compile("claude_code_opus_4_8", &request("agent"), "fallback");
        assert!(!compiled.text.contains("# Session context"));
        assert!(!compiled.text.contains("# Tools"));
        assert!(!compiled.text.contains("/Users/asgeirtj"));
        assert!(compiled.text.contains("Communication core"));
    }

    #[test]
    fn plan_mode_drops_write_tool_alias_lines() {
        let compiled = compile("codex_5_6", &request("plan"), "fallback");
        assert!(!compiled.text.contains("apply_patch"));
        assert!(!compiled.text.contains("write_file"));
    }

    #[test]
    fn model_aliases_reuse_the_retained_family_source() {
        let request = request("agent");
        let codex = compile("codex_5_6_sol", &request, "fallback");
        for alias in [
            "codex",
            "codex_5_5",
            "codex_5_6",
            "codex_5_6_terra",
            "codex_5_6_luna",
        ] {
            let compiled = compile(alias, &request, "fallback");
            assert_eq!(compiled.source_id, codex.source_id, "Codex alias: {alias}");
            assert_eq!(
                compiled.source_sha256, codex.source_sha256,
                "Codex alias: {alias}"
            );
        }

        let claude = compile("claude_code_fable_5", &request, "fallback");
        for alias in [
            "claude_code_lean",
            "claude_code_full",
            "claude_code_opus_4_6",
            "claude_code_opus_4_7",
            "claude_code_opus_4_8",
        ] {
            let compiled = compile(alias, &request, "fallback");
            assert_eq!(
                compiled.source_id, claude.source_id,
                "Claude alias: {alias}"
            );
            assert_eq!(
                compiled.source_sha256, claude.source_sha256,
                "Claude alias: {alias}"
            );
        }
    }

    #[test]
    fn claude_index_selects_compact_default_and_optional_workflow() {
        let request = request("agent");
        let lean = compile("claude_code_fable_5", &request, "fallback");
        let full = compile("claude_code_full", &request, "fallback");
        assert!(lean.compatible_chars < full.compatible_chars);
        assert!(lean.text.contains("# Workflow"));
        assert!(!lean.text.contains("# Context management"));
        assert!(!lean.text.contains("## Communication style"));
        assert!(full.text.contains("# Workflow"));
        assert!(full.text.contains("# Context management"));
        assert!(full.text.contains("## Communication style"));
        assert!(!lean.text.contains("# Session context"));
        assert!(!lean.text.contains("# Tools"));
    }
}
