from analyzer import client, MODEL
from google.genai import types

with open("test.jpeg", "rb") as f:
    img = types.Part.from_bytes(data=f.read(), mime_type="image/jpeg")

r = client.models.generate_content(
    model=MODEL,
    contents=[img, "Describe exactly what the person in this photo is wearing, item by item."],
)
print(r.text)