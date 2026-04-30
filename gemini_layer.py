import json
import os
import re

from google import genai
from dotenv import load_dotenv

load_dotenv()

_PROMPT_TEMPLATE = """You are a certified seasonal color analysis expert and professional fashion stylist.

You have received a precise color profile extracted from facial feature analysis using computer vision. Based ONLY on this structured data, provide a comprehensive seasonal color analysis.

Color Profile:
{profile_json}

Return a single JSON object with these exact keys. No markdown, no extra text — raw JSON only.

{{
  "season": "<one of: True Spring | Light Spring | Warm Spring | Light Summer | True Summer | Soft Summer | Warm Autumn | True Autumn | Deep Autumn | Deep Winter | True Winter | Cool Winter>",
  "season_description": "<2-3 sentences describing this seasonal type and its characteristics>",
  "reasoning": "<2-3 sentences explaining exactly why this season was determined from the provided profile>",
  "best_palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB"],
  "best_colors": ["<color name>", "<color name>", "<color name>", "<color name>", "<color name>", "<color name>", "<color name>", "<color name>"],
  "less_flattering_colors": ["<color name>", "<color name>", "<color name>", "<color name>", "<color name>"],
  "colors_to_avoid": ["<color name>", "<color name>", "<color name>", "<color name>"],
  "best_neutrals": ["<neutral color name>", "<neutral color name>", "<neutral color name>", "<neutral color name>"],
  "best_hair_colors": ["<hair color>", "<hair color>", "<hair color>", "<hair color>"],
  "metal_type": "<gold | silver | rose gold | mixed metals>",
  "metal_reasoning": "<one sentence explaining why this metal flatters the profile>",
  "accessories": {{
    "general": "<general accessories guidance>",
    "jewelry": "<specific jewelry style and color recommendations>",
    "bags_shoes": "<bag and shoe color recommendations>"
  }},
  "makeup": {{
    "foundation_undertone": "<undertone to look for in foundation: warm/pink/neutral-pink/neutral-warm>",
    "lips": ["<lip color 1>", "<lip color 2>", "<lip color 3>"],
    "eyes": ["<eyeshadow 1>", "<eyeshadow 2>", "<eyeshadow 3>"],
    "blush": "<blush color and finish>",
    "eyeliner": "<eyeliner color recommendation>",
    "overall_tip": "<one key makeup tip for this season>"
  }}
}}

RULES:
- Use ONLY data in the color profile above. Do not invent visual features.
- All palette hex codes must be valid 6-digit hex values starting with #.
- best_palette must contain exactly 8 hex codes that are the most harmonious colors for this season.
- Return raw JSON only — no code fences, no explanation outside the JSON."""


# Models ordered by preference. 1.5 models removed — not available in v1beta.
_FALLBACK_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

# Errors that mean "try the next model". Everything else (auth, bad request) raises immediately.
def _should_try_next(err_str: str) -> bool:
    return any(k in err_str for k in (
        "429", "RESOURCE_EXHAUSTED", "quota", "NOT_FOUND", "404",
    ))


def analyze_with_gemini(cv_result: dict) -> dict:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is missing from .env")

    client = genai.Client(api_key=api_key)

    preferred = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    models_to_try = [preferred] + [m for m in _FALLBACK_MODELS if m != preferred]

    profile = {
        "skin_undertone": cv_result["skin_undertone"],
        "skin_depth": cv_result["skin_depth"],
        "skin_tone_hex": cv_result["skin_tone_hex"],
        "contrast_level": cv_result["contrast"],
        "eye_color": cv_result["eye_color"],
        "eye_color_hex": cv_result["eye_color_hex"],
        "hair_color": cv_result["hair_color"],
    }
    if cv_result.get("hair_color_hex"):
        profile["hair_color_hex"] = cv_result["hair_color_hex"]

    prompt = _PROMPT_TEMPLATE.format(profile_json=json.dumps(profile, indent=2))

    last_err = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
            return _parse_response(response.text)
        except Exception as e:
            if _should_try_next(str(e)):
                last_err = e
                continue
            raise

    raise ValueError(
        "All Gemini models unavailable (quota exhausted or not found). "
        "Check your quota at https://ai.dev/rate-limit or try again later. "
        f"Last error: {last_err}"
    )


def _parse_response(text: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Gemini returned unparseable response: {text[:300]}")
