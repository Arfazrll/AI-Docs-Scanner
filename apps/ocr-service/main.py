import os
import tempfile
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PaddleOCR Service")

# Setup CORS for production
cors_origins_str = os.getenv("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")] if cors_origins_str else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR engine
# Using indonesian ('id') if available, otherwise 'en'
lang = os.getenv("PADDLE_OCR_LANG", "id")

# Bypass slow model source connectivity check that might cause aborts
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

# Bypass MKLDNN error
os.environ["FLAGS_use_mkldnn"] = "0"

# For a quick demo without GPU, use_angle_cls is good for rotated images
ocr = PaddleOCR(use_angle_cls=True, lang=lang, enable_mkldnn=False)

@app.get("/health")
def health_check():
    return {"status": "ok", "lang": lang}

@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Perform OCR
        # result is a list of lines, each line is [box, (text, confidence)]
        # Since we use single language or multi-lang, PaddleOCR returns a list of lists.
        result = ocr.ocr(tmp_path)
        
        # Cleanup temporary file
        os.unlink(tmp_path)
        
        if not result or len(result) == 0 or result[0] is None:
            return {"raw_text": "", "details": []}
            
        # Parse result
        details = []
        raw_text_parts = []
        
        if hasattr(result[0], 'keys') or isinstance(result[0], dict):
            # New PaddleOCR v3 (PaddleX) format
            res_dict = result[0]
            texts = res_dict.get('rec_texts', [])
            scores = res_dict.get('rec_scores', [])
            boxes = res_dict.get('dt_polys', [])
            
            for i in range(len(texts)):
                text = str(texts[i])
                confidence = float(scores[i]) if i < len(scores) else 0.0
                box = boxes[i].tolist() if i < len(boxes) and hasattr(boxes[i], 'tolist') else []
                
                details.append({
                    "text": text,
                    "confidence": confidence,
                    "bbox": box
                })
                raw_text_parts.append(text)
                
        else:
            # Old PaddleOCR format: result[0] is a list of lines
            lines = result[0]
            for line in lines:
                try:
                    if len(line) == 2 and isinstance(line[1], (tuple, list)):
                        box = line[0]
                        text = str(line[1][0])
                        confidence = float(line[1][1])
                    else:
                        box = []
                        text = str(line)
                        confidence = 0.0
                        
                    details.append({
                        "text": text,
                        "confidence": confidence,
                        "bbox": box
                    })
                    raw_text_parts.append(text)
                except Exception as inner_e:
                    pass
        
        return {
            "raw_text": "\n".join(raw_text_parts),
            "details": details
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(app, host=host, port=port)
