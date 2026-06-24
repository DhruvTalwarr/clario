from dotenv import load_dotenv
import os
import time

try:
    import groq
except ImportError:
    groq = None

# --- 1. Load Environment & Configure API ---
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if False and not api_key:
    raise ValueError("❌ GROQ_API_KEY not found in .env file.")

client = groq.Groq(api_key=api_key) if groq and api_key else None

# We use Llama 3 - it's fast and smart.
MODEL_NAME = "llama-3.1-8b-instant"
# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---
# THIS IS YOUR MOST IMPORTANT "MATERIAL".
# Your job is to test and edit this prompt until the output is perfect.
# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (System Instruction) ---

# --- 2. DEFINE YOUR "GOLDEN PROMPT" (Version 12 - Hinglish to English) ---

THE_GOLDEN_PROMPT = """
You are an AI assistant for Deaf and Hard-of-Hearing (DHH) users.
Your single job is to simplify a raw speech transcription.

**CORE TASK (MUST FOLLOW):**
1.  Your task is to simplify the text. Simplify the [Raw Text] into the [Target Language].

**CRITICAL SAFETY RULES (DO NOT VIOLATE):**
* **DO NOT HALLUCINATE.** Do NOT add any people ("mom"), places, objects, or *actions* ("I will slap you") that are not in the [Raw Text].
* **DO NOT GUESS.** If the [Raw Text] is unclear, just translate and simplify it as-is.
* **DO NOT ADD OPINIONS.** Your job is to translate, not editorialize.

**STYLE RULES:**
1.  **Simplicity:** Use short, simple sentences. Use 5th-grade level vocabulary.
2.  **Active Voice:** ALWAYS use the **Active Voice**. (e.g., "I bought chocolate.")
3.  **Remove Fillers:** Delete *all* filler words (like "um", "ah", "uh", "you know", "na", "toh", "matlab") and stutters.

**EMOTIONAL CONTEXT RULE:**
* You are **ONLY** allowed to add context in brackets `()` if the *tone* of the [Raw Text] implies an emotion.
* The context must **ONLY DESCRIBE THE TONE**, not add new actions.
* **GOOD Example:** "hum match jeet gaye" -> "We won the match (joyfully)."
* **BAD Example (DO NOT DO THIS):** "itna zor ka tamacha marunga" -> "I will slap you (aggressively)."
* **GOOD Example:** "itna zor ka tamacha marunga" -> "I will slap you very hard (spoken aggressively)."
* **GOOD Example:** "then dont ever come back" -> "then never come back (spoken angrily)."

**FINAL OUTPUT RULE:**
* Respond ONLY with the final, simplified caption. Do NOT add any extra phrases like "Here is the simplified text:".
"""

# --- 3. CREATE YOUR "GOLDEN FUNCTION" ---
# This is the function your Backend teammate will call.
def get_friendly_caption(raw_text: str, target_language: str) -> str:
    """
    Takes raw transcribed text, translates and simplifies it
    using the Groq API (Llama 3).
    """
    if not client:
        return simple_fallback_caption(raw_text, target_language)
    
    # We create the final prompt for the user
    prompt = f"[Raw Text]: \"{raw_text}\"\n[Input Language Hint]: \"{target_language}\""    
    try:
        start_time = time.time()
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": THE_GOLDEN_PROMPT,
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=MODEL_NAME,
            temperature=0.2, # Low temp = more factual, less creative
            max_tokens=1024,
        )
        
        end_time = time.time()
        
        response_text = chat_completion.choices[0].message.content.strip()
        
        print(f"\n--- AI Task (GROQ) ---")
        print(f"Raw: {raw_text}")
        print(f"Target: {target_language}")
        print(f"Simple: {response_text}")
        print(f"Time: {end_time - start_time:.2f}s")
        print("------------------------")
        
        return response_text
    
    except Exception as e:
        print(f"Error during Groq API call: {e}")
        return simple_fallback_caption(raw_text, target_language)


def simple_fallback_caption(raw_text: str, target_language: str) -> str:
    filler_words = ["um", "uh", "ah", "you know", "matlab", "toh", "like"]
    simplified = raw_text.strip()
    for filler in filler_words:
        simplified = simplified.replace(f" {filler} ", " ")
        simplified = simplified.replace(filler + ",", "")
        simplified = simplified.replace(filler.capitalize() + ",", "")

    simplified = " ".join(simplified.split())
    if not simplified:
        return ""

    if target_language.lower() not in ["english", "en"]:
        return f"{simplified} [{target_language} output needs GROQ_API_KEY]"

    return simplified

# --- 4. YOUR TEST BENCH ---
# Run this file directly to test your changes to the Golden Prompt.
if __name__ == "__main__":
    print(f"\n--- Running Local Test (Groq / {MODEL_NAME}) ---")
    
    # Test 1: Complex English -> Simple English
    test_1 = "Uh, notwithstanding the, you know, the significant meteorological challenges, the team endeavored to persevere."
    get_friendly_caption(test_1, "English")

    # Test 2: English -> Simple Hindi
    test_2 = "I would like to inform you that the meeting has been postponed until 3 PM tomorrow."
    get_friendly_caption(test_2, "Hindi")
    
    # Test 3: Hinglish -> Simple Hindi
    test_3 = "Toh, matlab, hum log kal jaa rahe hain, you know, market mein shopping karne."
    get_friendly_caption(test_3, "Hindi")
    
    # Test 4: More complex Hinglish
    test_4 = "Actually, I was thinking, agar time hai, we should probably, like, submit the report."
    get_friendly_caption(test_4, "Hindi")
    
    # Test 5: English -> Simple Marathi
    test_5 = "The government has implemented a new policy regarding educational reforms."
    get_friendly_caption(test_5, "Marathi")
    
    # --- ADD THIS NEW TEST ---
    
# Test 11: Question Hallucination Test
    test_11 = "hello aap kaise hain tabiyat theek hai"
    get_friendly_caption(test_11, "Hindi") # We pass "Hindi" as the input hint
    print("\n--- Local Test Complete ---")
