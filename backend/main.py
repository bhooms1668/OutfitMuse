import os
import shutil
import tempfile
from urllib.parse import quote_plus

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analyzer import analyze_outfit, analyze_outfit_image
from palette import extract_palette

app = FastAPI(title="OutfitMuse API")

# lets your frontend (a different port) call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your real domain when you deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

def pinterest_link(query: str) -> str:
    return f"https://www.pinterest.com/search/pins/?q={quote_plus(query)}"

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/analyze/text")
def analyze_text(description: str = Form(...)):
    try:
        result = analyze_outfit(description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}")
    result["pinterest_url"] = pinterest_link(result.get("pinterest_query", ""))
    return result

@app.post("/analyze/image")
def analyze_image(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in (".jpg", ".jpeg", ".png"):
        raise HTTPException(status_code=400, detail="Please upload a JPG or PNG image.")

    # save the upload to a temp file so our existing functions can read it
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        path = tmp.name

    try:
        result = analyze_outfit_image(path)
        result["palette"] = extract_palette(path)
        result["pinterest_url"] = pinterest_link(result.get("pinterest_query", ""))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}")
    finally:
        os.remove(path)  # always clean up the temp file

    return result