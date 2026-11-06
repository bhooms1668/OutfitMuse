import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client()

MODEL = "gemini-3.5-flash-lite"  # change the model name here only

PROMPT = """You are a fashion stylist and photo director.
Analyze the outfit and return ONLY JSON in exactly this shape.
Fill "visible_description" FIRST by describing exactly what the person is wearing, item by item.
List ONLY items you can clearly see. Never guess or add items that are not visible.

{
  "visible_description": "item-by-item description of what is actually visible",
  "garments": ["clothing items and accessories, taken from visible_description"],
  "colors": ["main colors as simple names"],
  "style_vibe": "one of: minimal, streetwear, old money, y2k, boho, casual, formal, sporty, other",
  "season": "summer, winter, monsoon, or all-season",
  "best_settings": ["3 photo locations that suit this outfit"],
  "pose_types": ["3 pose categories chosen specifically for THIS outfit, from: walking, sitting, leaning, twirling, hand-in-pocket, collar-adjust, over-the-shoulder-glance, crouching"],
  "caption_ideas": ["3 short Instagram captions"],
  "pinterest_query": "a search phrase for Instagram story or post layout inspiration"
}
"""

def analyze_outfit(description: str) -> dict:
    response = client.models.generate_content(
        model=MODEL,
        contents=f"{PROMPT}\n\nOutfit: {description}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    return json.loads(response.text)

def analyze_outfit_image(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    mime = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime)

    response = client.models.generate_content(
        model=MODEL,
        contents=[PROMPT + "\n\nAnalyze the outfit in this photo.", image_part],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    return json.loads(response.text)

if __name__ == "__main__":
    result = analyze_outfit_image("test.jpeg")
    print(json.dumps(result, indent=2))