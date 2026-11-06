from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()  # reads GEMINI_API_KEY from the environment

reply = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents="Say hello in one short sentence.",
)
print(reply.text)