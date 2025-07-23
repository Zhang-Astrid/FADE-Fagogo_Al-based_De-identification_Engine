import os
import time
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from rapidocr_paddle import RapidOCR
from fastapi import Body
import numpy as np
from pdf2image import convert_from_path
import cv2
import json

app = FastAPI()

class ROCRProcessor:
    def __init__(self, gpu=True):
        self.engine = RapidOCR(det_use_cuda=gpu, cls_use_cuda=gpu, rec_use_cuda=gpu)

    def process_pdf(self, pdf_path, ocr_path):
        ''' Process a PDF file and save OCR results to a JSON file.'''
        start_time = time.time()
        all_boxes, all_txts = [], []
        # Convert PDF pages to numpy type images
        imgs = convert_from_path(pdf_path, dpi=150, fmt="png", thread_count=10, use_pdftocairo=True)
        imgs_bin = [cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) for image in imgs]
        for i, img in enumerate(imgs_bin):
            result = self.engine(img, return_word_box=True)
            boxes, txts = [], []
            for line in result[0]:
                for box in line[3]:
                    boxes.append(box)
                for text in line[4]:
                    txts.append(text)
                txts.append('\n')
                boxes.append(box)
            boxes = [[i, p0[0], p0[1], p2[0], p2[1]] for p0, p1, p2, p3 in boxes]
            all_boxes.extend(boxes)
            all_txts.extend(txts)
        with open(ocr_path, 'w', encoding='utf-8') as f:
            json.dump({"boxes": all_boxes, "txts": all_txts}, f, ensure_ascii=False)
        end_time = time.time()
        print(f"[INFO] RapidOCR processing time: {end_time - start_time:.2f} seconds")

LAST_GPU = True
rocr = ROCRProcessor(gpu=True)

@app.post("/ocr")
async def extract_text_with_position(
    data: dict = Body(...)
):
    try:
        pdf_path = data.get("pdf_path")
        output_dir = data.get("output_dir")
        gpu = data.get("gpu", True)
        global LAST_GPU
        global rocr
        if gpu != LAST_GPU:
            print(f"Switching GPU setting from {LAST_GPU} to {gpu}")
            LAST_GPU = gpu
            rocr = ROCRProcessor(gpu=gpu)
        rocr.process_pdf(pdf_path, output_dir)
        return JSONResponse(content={"message": "OCR processing completed successfully."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":

    uvicorn.run(app, host="127.0.0.1", port=30000)